package com.biu.wood3n;

import android.content.Intent;

import androidx.annotation.Nullable;
import androidx.media3.session.DefaultMediaNotificationProvider;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

public class BiuPlayerService extends MediaSessionService {
    public static final String ACTION_START = "com.biu.wood3n.action.START_PLAYER";

    private void attachSessionAndUpdateNotification(boolean startInForegroundRequired) {
        MediaSession mediaSession = BiuPlayerManager.getInstance(this).attachService(this);
        if (mediaSession != null) {
            onUpdateNotification(mediaSession, startInForegroundRequired);
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        DefaultMediaNotificationProvider notificationProvider = new DefaultMediaNotificationProvider(this);
        notificationProvider.setSmallIcon(R.mipmap.ic_launcher);
        setMediaNotificationProvider(notificationProvider);
        attachSessionAndUpdateNotification(false);
    }

    @Override
    public int onStartCommand(@Nullable Intent intent, int flags, int startId) {
        super.onStartCommand(intent, flags, startId);
        boolean startInForegroundRequired = intent != null && ACTION_START.equals(intent.getAction());
        attachSessionAndUpdateNotification(startInForegroundRequired);
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        BiuPlayerManager.getInstance(this).releasePlayer();
        BiuPlayerManager.getInstance(this).detachService(this);
        super.onDestroy();
    }

    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return BiuPlayerManager.getInstance(this).getMediaSession();
    }
}
