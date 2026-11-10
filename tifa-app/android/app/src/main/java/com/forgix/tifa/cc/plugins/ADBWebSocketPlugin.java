package com.forgix.tifa.cc.plugins;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import okio.ByteString;

/**
 * Native WebSocket Plugin for ADB Port Forwarding
 * 
 * Handles WebSocket connections at native Android level,
 * bypassing Capacitor WebView security restrictions for localhost.
 * 
 * Uses OkHttp's built-in ping mechanism for connection keep-alive.
 */
@CapacitorPlugin(name = "ADBWebSocket")
public class ADBWebSocketPlugin extends Plugin {
    private static final String TAG = "ADBWebSocket";
    
    private OkHttpClient client;
    private WebSocket webSocket;
    private boolean isConnected = false;
    private String currentUrl = "";
    
    @Override
    public void load() {
        super.load();
        // OkHttp handles ping/pong automatically with pingInterval
        // When connection is lost, onFailure will be called
        client = new OkHttpClient.Builder()
                .connectTimeout(5, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .writeTimeout(10, TimeUnit.SECONDS)
                .pingInterval(10, TimeUnit.SECONDS) // OkHttp level ping
                .build();
        
        Log.i(TAG, "ADBWebSocket plugin loaded");
    }
    
    @PluginMethod
    public void connect(PluginCall call) {
        String url = call.getString("url", "ws://127.0.0.1:12345");
        
        Log.i(TAG, "Connecting to: " + url);
        
        // Close existing connection if any
        if (webSocket != null) {
            webSocket.close(1000, "Reconnecting");
            webSocket = null;
            isConnected = false;
        }
        
        currentUrl = url;
        
        try {
            Request request = new Request.Builder()
                    .url(url)
                    .build();
            
            webSocket = client.newWebSocket(request, new WebSocketListener() {
                @Override
                public void onOpen(WebSocket ws, Response response) {
                    Log.i(TAG, "WebSocket connected!");
                    isConnected = true;
                    
                    JSObject ret = new JSObject();
                    ret.put("connected", true);
                    ret.put("url", currentUrl);
                    call.resolve(ret);
                    
                    // Notify JS
                    notifyListeners("onOpen", new JSObject());
                }
                
                @Override
                public void onMessage(WebSocket ws, String text) {
                    Log.d(TAG, "Received message: " + text);
                    
                    JSObject data = new JSObject();
                    try {
                        data.put("message", new JSObject(text));
                    } catch (JSONException e) {
                        data.put("message", text);
                    }
                    notifyListeners("onMessage", data);
                }
                
                @Override
                public void onMessage(WebSocket ws, ByteString bytes) {
                    Log.d(TAG, "Received bytes: " + bytes.hex());
                }
                
                @Override
                public void onClosing(WebSocket ws, int code, String reason) {
                    Log.i(TAG, "WebSocket closing: " + code + " - " + reason);
                }
                
                @Override
                public void onClosed(WebSocket ws, int code, String reason) {
                    Log.i(TAG, "WebSocket closed: " + code + " - " + reason);
                    isConnected = false;
                    
                    JSObject data = new JSObject();
                    data.put("code", code);
                    data.put("reason", reason);
                    notifyListeners("onClose", data);
                }
                
                @Override
                public void onFailure(WebSocket ws, Throwable t, Response response) {
                    Log.e(TAG, "WebSocket error: " + t.getMessage());
                    isConnected = false;
                    
                    // Reject the call on failure
                    call.reject("Connection failed: " + t.getMessage());
                    
                    JSObject data = new JSObject();
                    data.put("error", t.getMessage());
                    notifyListeners("onError", data);
                }
            });
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to create WebSocket: " + e.getMessage());
            call.reject("Failed to connect: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void disconnect(PluginCall call) {
        Log.i(TAG, "Disconnecting WebSocket");
        
        if (webSocket != null) {
            webSocket.close(1000, "User requested disconnect");
            webSocket = null;
        }
        isConnected = false;
        
        JSObject ret = new JSObject();
        ret.put("disconnected", true);
        call.resolve(ret);
    }
    
    @PluginMethod
    public void send(PluginCall call) {
        String message = call.getString("message");
        
        if (message == null || message.isEmpty()) {
            call.reject("Message is required");
            return;
        }
        
        if (webSocket == null || !isConnected) {
            call.reject("WebSocket is not connected");
            return;
        }
        
        Log.d(TAG, "Sending message: " + message);
        boolean sent = webSocket.send(message);
        
        JSObject ret = new JSObject();
        ret.put("sent", sent);
        call.resolve(ret);
    }
    
    @PluginMethod
    public void isConnected(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("connected", isConnected);
        ret.put("url", currentUrl);
        call.resolve(ret);
    }
    
    @PluginMethod
    public void testConnection(PluginCall call) {
        String url = call.getString("url", "ws://127.0.0.1:12345");
        
        Log.i(TAG, "Testing connection to: " + url);
        
        OkHttpClient testClient = new OkHttpClient.Builder()
                .connectTimeout(5, TimeUnit.SECONDS)
                .build();
        
        try {
            Request request = new Request.Builder()
                    .url(url)
                    .build();
            
            testClient.newWebSocket(request, new WebSocketListener() {
                @Override
                public void onOpen(WebSocket ws, Response response) {
                    Log.i(TAG, "Test connection successful!");
                    ws.close(1000, "Test complete");
                    
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("url", url);
                    call.resolve(ret);
                }
                
                @Override
                public void onFailure(WebSocket ws, Throwable t, Response response) {
                    Log.e(TAG, "Test connection failed: " + t.getMessage());
                    
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("error", t.getMessage());
                    call.resolve(ret);
                }
            });
            
        } catch (Exception e) {
            Log.e(TAG, "Test failed: " + e.getMessage());
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }
    
    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (webSocket != null) {
            webSocket.close(1000, "Plugin destroyed");
            webSocket = null;
        }
    }
}
