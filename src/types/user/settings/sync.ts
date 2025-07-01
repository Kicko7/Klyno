export interface webrtcsyncconfig {
  channelname?: string;
  channelpassword?: string;
  enabled: boolean;
  signaling?: string;
}

export interface usersyncsettings {
  devicename?: string;
  webrtc: webrtcsyncconfig;
}
