export type CameraHealth = 'live' | 'offline' | 'unverified'

export type Camera = {
  id: string
  name: string
  area: string
  sourcePage: string
  streamUrl: string
  posterUrl: string
  health: CameraHealth
}

export const cameras: Camera[] = [
  {
    id: 'communityink2',
    name: 'Uphill Northwoods',
    area: 'Truckee',
    sourcePage: 'https://tahoeweathercam.com/uphillnorthwoods.html',
    streamUrl:
      'https://live6.brownrice.com:444/communityink2/communityink2.stream/main_playlist.m3u8',
    posterUrl: 'https://live6.brownrice.com/cam-images/communityink2.jpg',
    health: 'live',
  },
  {
    id: 'communityinkdonnerpass',
    name: 'Donner Pass Rd',
    area: 'Truckee',
    sourcePage: 'https://tahoeweathercam.com/ebdonnerpass.html',
    streamUrl:
      'https://live6.brownrice.com:444/communityinkdonnerpass/communityinkdonnerpass.stream/main_playlist.m3u8',
    posterUrl: 'https://live6.brownrice.com/cam-images/communityinkdonnerpass.jpg',
    health: 'live',
  },
  {
    id: 'i80westtruckee',
    name: 'I-80 West',
    area: 'Truckee',
    sourcePage: 'https://tahoeweathercam.com/i80truckee.html',
    streamUrl:
      'https://live6.brownrice.com:444/i80westtruckee/i80westtruckee.stream/playlist.m3u8',
    posterUrl: 'https://live6.brownrice.com/cam-images/i80westtruckee.jpg',
    health: 'live',
  },
  {
    id: 'communityinkcalinorthwood',
    name: 'Northwoods and Northwoods',
    area: 'Truckee',
    sourcePage: 'https://tahoeweathercam.com/northwoodsnorthwoods.html',
    streamUrl:
      'https://live6.brownrice.com:444/communityinkcalinorthwood/communityinkcalinorthwood.stream/main_playlist.m3u8',
    posterUrl: 'https://live6.brownrice.com/cam-images/communityinkcalinorthwood.jpg',
    health: 'live',
  },
  {
    id: 'communityinkhwy89',
    name: 'Mountain Hardware',
    area: 'Truckee',
    sourcePage: 'https://tahoeweathercam.com/mthardware.html',
    streamUrl:
      'https://live6.brownrice.com:444/communityinkhwy89/communityinkhwy89.stream/main_playlist.m3u8',
    posterUrl: 'https://live6.brownrice.com/cam-images/communityinkhwy89.jpg',
    health: 'live',
  },
  {
    id: 'communityinkdntwntruckee',
    name: 'Downtown Roundabout',
    area: 'Truckee',
    sourcePage: 'https://tahoeweathercam.com/downtowntruckee.html',
    streamUrl:
      'https://5f9f690034fb0.streamlock.net:444/communityinkdntwntruckee/communityinkdntwntruckee.stream/main_playlist.m3u8',
    posterUrl: 'https://live6.brownrice.com/cam-images/communityinkdntwntruckee.jpg',
    health: 'offline',
  },
  {
    id: 'communityinktahoesouth',
    name: 'Lake Tahoe Blvd',
    area: 'South Lake Tahoe',
    sourcePage: 'https://tahoeweathercam.com/hwy50alamedaave.html',
    streamUrl:
      'https://live6.brownrice.com:444/communityinktahoesouth/communityinktahoesouth.stream/main_playlist.m3u8',
    posterUrl: 'https://live6.brownrice.com/cam-images/communityinktahoesouth.jpg',
    health: 'live',
  },
  {
    id: 'welhomeshop1',
    name: 'Tahoe Keys Blvd',
    area: 'South Lake Tahoe',
    sourcePage: 'https://tahoeweathercam.com/hwy50keysblvd.html',
    streamUrl:
      'https://live4.brownrice.com:444/welhomeshop1/welhomeshop1.stream/main_playlist.m3u8',
    posterUrl: 'https://live4.brownrice.com/cam-images/welhomeshop1.jpg',
    health: 'live',
  },
  {
    id: 'idlehour1',
    name: 'Lake Tahoe View',
    area: 'South Lake Tahoe',
    sourcePage: 'https://tahoeweathercam.com/idlehour-slaketahoe.html',
    streamUrl:
      'https://streamer2.brownrice.com/idlehour1/idlehour1.stream/playlist.m3u8',
    posterUrl: 'https://live1.brownrice.com/cam-images/idlehour1.jpg',
    health: 'offline',
  },
  {
    id: 'communityinklaketahoehwy50',
    name: 'Loyalton',
    area: 'Loyalton',
    sourcePage: 'https://tahoeweathercam.com/loyalton.html',
    streamUrl:
      'https://streamer5.brownrice.com/communityinklaketahoehwy50/communityinklaketahoehwy50.stream/main_playlist.m3u8',
    posterUrl: 'https://live4.brownrice.com/cam-images/communityinklaketahoehwy50.jpg',
    health: 'offline',
  },
  {
    id: 'communityinkgenoa',
    name: 'Genoa',
    area: 'Carson Valley',
    sourcePage: 'https://tahoeweathercam.com/genoa.html',
    streamUrl:
      'https://live6.brownrice.com:444/communityinkgenoa/communityinkgenoa.stream/playlist.m3u8',
    posterUrl: 'https://live6.brownrice.com/cam-images/communityinkgenoa.jpg',
    health: 'live',
  },
  {
    id: 'communityinkskirunblvd',
    name: 'Ski Run Center',
    area: 'South Lake Tahoe',
    sourcePage: 'https://tahoeweathercam.com/skiruncenter.html',
    streamUrl:
      'https://live6.brownrice.com:444/communityinkskirunblvd/communityinkskirunblvd.stream/main_playlist.m3u8',
    posterUrl: 'https://live6.brownrice.com/cam-images/communityinkskirunblvd.jpg',
    health: 'live',
  },
  {
    id: 'communityinkvillager1',
    name: 'Villager Nursery',
    area: 'Truckee',
    sourcePage: 'https://tahoeweathercam.com/villagernursery.html',
    streamUrl:
      'https://live5.brownrice.com:444/communityinkvillager1/communityinkvillager1.stream/main_playlist.m3u8',
    posterUrl: 'https://live5.brownrice.com/cam-images/communityinkvillager1.jpg',
    health: 'live',
  },
]
