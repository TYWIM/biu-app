package com.biu.wood3n;

import android.content.Context;
import android.content.Intent;
import android.media.audiofx.Equalizer;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import androidx.core.content.ContextCompat;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.ForwardingPlayer;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.Player;
import androidx.media3.datasource.DataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.LoadControl;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.exoplayer.source.MediaSource;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

import com.getcapacitor.JSObject;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;

public class BiuPlayerManager {
    public interface StateListener {
        void onStateChanged(JSObject state);
    }

    private static final String DESKTOP_USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

    private static volatile BiuPlayerManager instance;

    private final Context appContext;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Set<StateListener> listeners = new CopyOnWriteArraySet<>();

    private ExoPlayer exoPlayer;
    private ForwardingPlayer forwardingPlayer;
    private MediaSession mediaSession;
    private Equalizer equalizer;
    private String sourceUrl = "";
    private String title = "";
    private String artist = "";
    private String cover = "";
    private float volume = 1.0f;
    private boolean muted = false;
    private float playbackRate = 1.0f;
    private boolean loop = false;
    private boolean ready = false;
    private boolean ended = false;
    private boolean progressRunning = false;
    private short[] eqBandLevels;

    private final Runnable progressRunnable = new Runnable() {
        @Override
        public void run() {
            if (!progressRunning || exoPlayer == null) {
                return;
            }

            notifyState("progress", null);

            if (exoPlayer.isPlaying() || exoPlayer.getPlayWhenReady()) {
                mainHandler.postDelayed(this, 500);
            } else {
                progressRunning = false;
            }
        }
    };

    private final Player.Listener playerListener = new Player.Listener() {
        @Override
        public void onPlaybackStateChanged(int playbackState) {
            ready = playbackState == Player.STATE_READY;
            ended = playbackState == Player.STATE_ENDED;
            notifyState(resolvePlaybackReason(playbackState), null);
            updateProgressLoop();
        }

        @Override
        public void onIsPlayingChanged(boolean isPlaying) {
            notifyState(isPlaying ? "playing" : "pause", null);
            updateProgressLoop();
        }

        @Override
        public void onPlayerError(PlaybackException error) {
            notifyState("error", error.getMessage());
            updateProgressLoop();
        }
    };

    private BiuPlayerManager(Context context) {
        appContext = context.getApplicationContext();
        if (Looper.myLooper() == Looper.getMainLooper()) {
            ensurePlayer();
        } else {
            mainHandler.post(this::ensurePlayer);
        }
    }

    public static BiuPlayerManager getInstance(Context context) {
        if (instance == null) {
            synchronized (BiuPlayerManager.class) {
                if (instance == null) {
                    instance = new BiuPlayerManager(context);
                }
            }
        }

        return instance;
    }

    public MediaSession attachService(MediaSessionService service) {
        ensurePlayer();
        if (mediaSession == null) {
            mediaSession = new MediaSession.Builder(appContext, forwardingPlayer)
                    .setId("biu-player")
                    .build();
        }

        if (!service.isSessionAdded(mediaSession)) {
            service.addSession(mediaSession);
        }

        return mediaSession;
    }

    public void detachService(MediaSessionService service) {
        if (mediaSession == null) {
            return;
        }

        if (service.isSessionAdded(mediaSession)) {
            service.removeSession(mediaSession);
        }
    }

    public void releasePlayer() {
        if (exoPlayer != null) {
            progressRunning = false;
            mainHandler.removeCallbacks(progressRunnable);
            exoPlayer.removeListener(playerListener);
            exoPlayer.release();
            exoPlayer = null;
        }
        forwardingPlayer = null;
        if (mediaSession != null) {
            mediaSession.release();
            mediaSession = null;
        }
        releaseEqualizer();
        ready = false;
        ended = false;
    }

    public MediaSession getMediaSession() {
        return mediaSession;
    }

    public ExoPlayer getPlayer() {
        ensurePlayer();
        return exoPlayer;
    }

    public void addListener(StateListener listener) {
        listeners.add(listener);
        if (Looper.myLooper() == Looper.getMainLooper()) {
            listener.onStateChanged(buildState("sync", null));
        } else {
            mainHandler.post(() -> listener.onStateChanged(buildState("sync", null)));
        }
    }

    public void removeListener(StateListener listener) {
        listeners.remove(listener);
    }

    public JSObject configure(double nextVolume, boolean nextMuted, double nextPlaybackRate, boolean nextLoop) {
        ensurePlayer();
        volume = (float) Math.max(0d, Math.min(1d, nextVolume));
        muted = nextMuted;
        playbackRate = (float) Math.max(0.25, Math.min(4, nextPlaybackRate));
        loop = nextLoop;
        applyConfig();
        notifyState("config", null);
        return buildState("config", null);
    }

    public JSObject setSource(String url) {
        ensurePlayer();
        sourceUrl = url == null ? "" : url;
        ready = false;
        ended = false;

        if (sourceUrl.isEmpty()) {
            exoPlayer.pause();
            exoPlayer.stop();
            exoPlayer.clearMediaItems();
            notifyState("cleared", null);
            return buildState("cleared", null);
        }

        ensureService();
        MediaItem mediaItem = buildMediaItem();
        MediaSource mediaSource = new DefaultMediaSourceFactory(buildDataSourceFactory(sourceUrl)).createMediaSource(mediaItem);
        exoPlayer.setMediaSource(mediaSource);
        exoPlayer.prepare();
        notifyState("source", null);
        return buildState("source", null);
    }

    public void updateMetadata(String nextTitle, String nextArtist, String nextCover) {
        title = nextTitle == null ? "" : nextTitle;
        artist = nextArtist == null ? "" : nextArtist;
        cover = nextCover == null ? "" : nextCover;

        if (exoPlayer == null || sourceUrl.isEmpty() || exoPlayer.getMediaItemCount() == 0) {
            notifyState("metadata", null);
            return;
        }

        exoPlayer.replaceMediaItem(0, buildMediaItem());
        notifyState("metadata", null);
    }

    public JSObject play() {
        ensurePlayer();
        exoPlayer.play();
        ensureService();
        notifyState("play", null);
        updateProgressLoop();
        return buildState("play", null);
    }

    public JSObject pause() {
        ensurePlayer();
        exoPlayer.pause();
        notifyState("pause", null);
        updateProgressLoop();
        return buildState("pause", null);
    }

    public JSObject seekTo(double position) {
        ensurePlayer();
        ended = false;
        exoPlayer.seekTo((long) (Math.max(0, position) * 1000L));
        notifyState("seek", null);
        return buildState("seek", null);
    }

    public JSObject clear() {
        ensurePlayer();
        sourceUrl = "";
        ready = false;
        ended = false;
        exoPlayer.pause();
        exoPlayer.stop();
        exoPlayer.clearMediaItems();
        notifyState("cleared", null);
        updateProgressLoop();
        return buildState("cleared", null);
    }

    public JSObject getState() {
        ensurePlayer();
        return buildState("sync", null);
    }

    private void ensurePlayer() {
        if (exoPlayer != null) {
            return;
        }

        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build();

        LoadControl loadControl = new DefaultLoadControl.Builder()
                .setBufferDurationsMs(
                        15000,
                        60000,
                        2500,
                        5000
                )
                .build();

        exoPlayer = new ExoPlayer.Builder(appContext)
                .setAudioAttributes(audioAttributes, true)
                .setWakeMode(C.WAKE_MODE_NETWORK)
                .setHandleAudioBecomingNoisy(true)
                .setLoadControl(loadControl)
                .build();
        exoPlayer.addListener(playerListener);
        exoPlayer.addListener(new Player.Listener() {
            @Override
            public void onAudioSessionIdChanged(int audioSessionId) {
                if (audioSessionId != C.AUDIO_SESSION_ID_UNSET) {
                    setupEqualizer(audioSessionId);
                }
            }
        });
        applyConfig();

        forwardingPlayer = new ForwardingPlayer(exoPlayer) {
            @Override
            public void seekToNext() {
                notifyCommandEvent("next");
            }

            @Override
            public void seekToNextMediaItem() {
                notifyCommandEvent("next");
            }

            @Override
            public void seekToPrevious() {
                notifyCommandEvent("prev");
            }

            @Override
            public void seekToPreviousMediaItem() {
                notifyCommandEvent("prev");
            }

            @Override
            public boolean isCommandAvailable(int command) {
                if (command == Player.COMMAND_SEEK_TO_NEXT
                        || command == Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM
                        || command == Player.COMMAND_SEEK_TO_PREVIOUS
                        || command == Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM) {
                    return true;
                }
                return super.isCommandAvailable(command);
            }
        };
    }

    private void ensureService() {
        Intent intent = new Intent(appContext, BiuPlayerService.class);
        intent.setAction(BiuPlayerService.ACTION_START);
        ContextCompat.startForegroundService(appContext, intent);
    }

    private void applyConfig() {
        if (exoPlayer == null) {
            return;
        }

        exoPlayer.setVolume(muted ? 0f : volume);
        exoPlayer.setRepeatMode(loop ? Player.REPEAT_MODE_ONE : Player.REPEAT_MODE_OFF);
        exoPlayer.setPlaybackParameters(new PlaybackParameters(playbackRate));
    }

    private void updateProgressLoop() {
        if (exoPlayer == null) {
            progressRunning = false;
            mainHandler.removeCallbacks(progressRunnable);
            return;
        }

        boolean shouldRun = exoPlayer.isPlaying() || exoPlayer.getPlayWhenReady();
        if (shouldRun && !progressRunning) {
            progressRunning = true;
            mainHandler.post(progressRunnable);
            return;
        }

        if (!shouldRun && progressRunning) {
            progressRunning = false;
            mainHandler.removeCallbacks(progressRunnable);
        }
    }

    private DataSource.Factory buildDataSourceFactory(String url) {
        DefaultHttpDataSource.Factory factory = new DefaultHttpDataSource.Factory()
                .setAllowCrossProtocolRedirects(true)
                .setUserAgent(DESKTOP_USER_AGENT);

        Map<String, String> headers = resolveHeaders(url);
        if (!headers.isEmpty()) {
            factory.setDefaultRequestProperties(headers);
        }

        return factory;
    }

    private Map<String, String> resolveHeaders(String url) {
        Map<String, String> headers = new HashMap<>();
        if (needsRefererInjection(url)) {
            headers.put("Referer", "https://www.bilibili.com");
            headers.put("User-Agent", DESKTOP_USER_AGENT);
        }
        return headers;
    }

    private boolean needsRefererInjection(String url) {
        if (url == null) {
            return false;
        }

        return url.contains(".bilivideo.com")
                || url.contains(".hdslb.com")
                || url.contains("upos-sz-")
                || (url.contains("cn-") && url.contains("bilivideo"));
    }

    private MediaItem buildMediaItem() {
        MediaMetadata.Builder metadataBuilder = new MediaMetadata.Builder()
                .setTitle(title)
                .setArtist(artist);

        if (!cover.isEmpty()) {
            metadataBuilder.setArtworkUri(Uri.parse(cover));
        }

        return new MediaItem.Builder()
                .setUri(Uri.parse(sourceUrl))
                .setMediaMetadata(metadataBuilder.build())
                .build();
    }

    private JSObject buildState(String reason, String error) {
        JSObject state = new JSObject();
        if (reason != null) {
            state.put("reason", reason);
        }

        state.put("src", sourceUrl);
        state.put("currentTime", exoPlayer == null ? 0 : Math.max(0, exoPlayer.getCurrentPosition()) / 1000.0);

        double duration = 0;
        if (exoPlayer != null && exoPlayer.getDuration() != C.TIME_UNSET && exoPlayer.getDuration() > 0) {
            duration = exoPlayer.getDuration() / 1000.0;
        }
        state.put("duration", duration);
        state.put("paused", exoPlayer == null || !exoPlayer.getPlayWhenReady());
        state.put("playing", exoPlayer != null && exoPlayer.isPlaying());
        state.put("buffering", exoPlayer != null && exoPlayer.getPlaybackState() == Player.STATE_BUFFERING);
        state.put("muted", muted);
        state.put("volume", volume);
        state.put("playbackRate", playbackRate);
        state.put("loop", loop);
        state.put("ready", ready);
        state.put("ended", ended);

        if (error != null && !error.isEmpty()) {
            state.put("error", error);
        }

        return state;
    }

    private void notifyState(String reason, String error) {
        JSObject state = buildState(reason, error);
        for (StateListener listener : listeners) {
            listener.onStateChanged(state);
        }
    }

    private void notifyCommandEvent(String command) {
        JSObject event = new JSObject();
        event.put("reason", "command");
        event.put("command", command);
        for (StateListener listener : listeners) {
            listener.onStateChanged(event);
        }
    }

    private String resolvePlaybackReason(int playbackState) {
        if (playbackState == Player.STATE_BUFFERING) {
            return "buffering";
        }
        if (playbackState == Player.STATE_READY) {
            return "ready";
        }
        if (playbackState == Player.STATE_ENDED) {
            return "ended";
        }
        if (playbackState == Player.STATE_IDLE && sourceUrl.isEmpty()) {
            return "cleared";
        }
        return "state";
    }

    // ========== Equalizer ==========

    private void setupEqualizer(int audioSessionId) {
        releaseEqualizer();
        try {
            equalizer = new Equalizer(0, audioSessionId);
            equalizer.setEnabled(true);
            if (eqBandLevels != null) {
                applyEqualizerBands(eqBandLevels);
            }
        } catch (Exception e) {
            android.util.Log.w("BiuPlayer", "Equalizer setup failed: " + e.getMessage());
        }
    }

    private void releaseEqualizer() {
        if (equalizer != null) {
            try {
                equalizer.setEnabled(false);
                equalizer.release();
            } catch (Exception e) {
                android.util.Log.w("BiuPlayer", "Equalizer release failed: " + e.getMessage());
            }
            equalizer = null;
        }
    }

    public JSObject getEqualizerInfo() {
        JSObject result = new JSObject();
        if (equalizer == null) {
            result.put("available", false);
            return result;
        }

        result.put("available", true);
        result.put("minLevel", equalizer.getBandLevelRange()[0]);
        result.put("maxLevel", equalizer.getBandLevelRange()[1]);

        short numBands = equalizer.getNumberOfBands();
        result.put("numBands", numBands);

        com.getcapacitor.JSArray bands = new com.getcapacitor.JSArray();
        for (short i = 0; i < numBands; i++) {
            JSObject band = new JSObject();
            band.put("index", i);
            band.put("frequency", equalizer.getCenterFreq(i) / 1000); // Hz -> kHz
            band.put("level", equalizer.getBandLevel(i));
            bands.put(band);
        }
        result.put("bands", bands);

        return result;
    }

    public JSObject setEqualizerBands(short[] levels) {
        eqBandLevels = levels;
        if (equalizer != null) {
            applyEqualizerBands(levels);
        }
        return getEqualizerInfo();
    }

    private void applyEqualizerBands(short[] levels) {
        if (equalizer == null || levels == null) {
            return;
        }
        short numBands = equalizer.getNumberOfBands();
        for (short i = 0; i < Math.min(numBands, levels.length); i++) {
            try {
                short[] range = equalizer.getBandLevelRange();
                short level = (short) Math.max(range[0], Math.min(range[1], levels[i]));
                equalizer.setBandLevel(i, level);
            } catch (Exception e) {
                android.util.Log.w("BiuPlayer", "setBandLevel failed for band " + i + ": " + e.getMessage());
            }
        }
    }

    public JSObject setEqualizerPreset(String presetName) {
        if (equalizer == null) {
            return getEqualizerInfo();
        }

        short[] levels = EqualizerPresets.getPreset(presetName);
        if (levels != null) {
            return setEqualizerBands(levels);
        }
        return getEqualizerInfo();
    }
}
