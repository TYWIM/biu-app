package com.biu.wood3n;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BiuPlayer")
public class BiuPlayerPlugin extends Plugin {
    private BiuPlayerManager playerManager;

    private final BiuPlayerManager.StateListener stateListener = state -> notifyListeners("playerStateChange", state);

    @Override
    public void load() {
        playerManager = BiuPlayerManager.getInstance(getContext());
        playerManager.addListener(stateListener);
    }

    @Override
    protected void handleOnDestroy() {
        if (playerManager != null) {
            playerManager.removeListener(stateListener);
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void configure(PluginCall call) {
        double volume = call.getDouble("volume", 0.5);
        boolean muted = call.getBoolean("muted", false);
        double playbackRate = call.getDouble("playbackRate", 1.0);
        boolean loop = call.getBoolean("loop", false);

        getActivity().runOnUiThread(() -> {
            try {
                call.resolve(playerManager.configure(volume, muted, playbackRate, loop));
            } catch (Exception e) {
                call.reject("configure failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void setSource(PluginCall call) {
        String url = call.getString("url", "");

        getActivity().runOnUiThread(() -> {
            try {
                call.resolve(playerManager.setSource(url));
            } catch (Exception e) {
                call.reject("setSource failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void updateMetadata(PluginCall call) {
        String title = call.getString("title", "");
        String artist = call.getString("artist", "");
        String cover = call.getString("cover", "");

        getActivity().runOnUiThread(() -> {
            try {
                playerManager.updateMetadata(title, artist, cover);
                call.resolve();
            } catch (Exception e) {
                call.reject("updateMetadata failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void play(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                call.resolve(playerManager.play());
            } catch (Exception e) {
                call.reject("play failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void pause(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                call.resolve(playerManager.pause());
            } catch (Exception e) {
                call.reject("pause failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void seekTo(PluginCall call) {
        double position = call.getDouble("position", 0.0);

        getActivity().runOnUiThread(() -> {
            try {
                call.resolve(playerManager.seekTo(position));
            } catch (Exception e) {
                call.reject("seekTo failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void clear(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                call.resolve(playerManager.clear());
            } catch (Exception e) {
                call.reject("clear failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void getState(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                call.resolve(playerManager.getState());
            } catch (Exception e) {
                call.reject("getState failed: " + e.getMessage());
            }
        });
    }
}
