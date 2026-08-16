export const environment = {
  production: false,

  // apiUrl: 'http://localhost:5011/api'
  apiUrl: 'http://192.168.1.4:5011/api',
  // apiUrl: 'http://192.168.9.146:5011/api'

  iceServers: [
    { urls: 'stun:stun.relay.metered.ca:80' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: '02390c91f5732650459073e6',
      credential: '3QacNDMVJ4J5DqX2'
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: '02390c91f5732650459073e6',
      credential: '3QacNDMVJ4J5DqX2'
    },
    {
      urls: 'turns:global.relay.metered.ca:443?transport=tcp',
      username: '02390c91f5732650459073e6',
      credential: '3QacNDMVJ4J5DqX2'
    }
  ]
};