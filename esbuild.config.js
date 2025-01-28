// App.js
import { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, OverlayView } from '@react-google-maps/api';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import GeoTIFF from 'geotiff.js';

// Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDHRxvFWe8WggQ3yoV7GlJV2OVwL1fZ6Xc",
  authDomain: "capstone-a4973.firebaseapp.com",
  projectId: "capstone-a4973",
  storageBucket: "capstone-a4973.firebasestorage.app",
  messagingSenderId: "573679897910",
  appId: "1:573679897910:web:575494bd624966f44c7797"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Komponen Peta
const MapWithOverlay = () => {
  const [map, setMap] = useState(null);
  const [overlay, setOverlay] = useState(null);
  const [bounds, setBounds] = useState(null);

  useEffect(() => {
    const loadGeoTIFF = async () => {
      try {
        // 1. Ambil file dari Firebase Storage
        const storageRef = ref(storage, 'Yogyakarta/random_forest.tif');
        const url = await getDownloadURL(storageRef);
        
        // 2. Parse GeoTIFF
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
        const image = await tiff.getImage();
        
        // 3. Ekstrak informasi geolokasi
        const bbox = image.getBoundingBox();
        const [minLng, minLat, maxLng, maxLat] = bbox;
        
        setBounds(new window.google.maps.LatLngBounds(
          { lat: minLat, lng: minLng },
          { lat: maxLat, lng: maxLng }
        ));

        // 4. Buat overlay
        const raster = await image.readRasters();
        const canvas = document.createElement('canvas');
        canvas.width = raster.width;
        canvas.height = raster.height;
        
        const ctx = canvas.getContext('2d');
        const imageData = new ImageData(raster[0], raster.width, raster.height);
        ctx.putImageData(imageData, 0, 0);

        setOverlay(canvas.toDataURL());
        
      } catch (error) {
        console.error('Error loading GeoTIFF:', error);
      }
    };

    loadGeoTIFF();
  }, [bounds]);

  return (
    <LoadScript googleMapsApiKey="AIzaSyDhhPQ28U2ZMyeonVPgIHYYNKqOLqI9Bys">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100vh' }}
        center={bounds?.getCenter()}
        zoom={12}
        onLoad={map => {
          setMap(map);
          // Center map on the overlay
          if (bounds) {
            map.fitBounds(bounds);
          }
        }}
      >
        {bounds && overlay && (
          <OverlayView
            position={bounds.getCenter()}
            mapPaneName={OverlayView.OVERLAY_LAYER}
            getPixelPositionOffset={(width, height) => ({
              x: -width/2,
              y: -height/2
            })}
          >
            <img
              src={overlay}
              alt="GeoTIFF Overlay"
              style={{
                width: '100%',
                height: '100%',
                opacity: 0.7,
                pointerEvents: 'none'
              }}
              bounds={bounds}
            />
          </OverlayView>
        )}
      </GoogleMap>
    </LoadScript>
  );
};

export default MapWithOverlay;

// Exclude Babel runtime helpers
external: [
  'babel-runtime/helpers/possibleConstructorReturn',
  'babel-runtime/helpers/inherits',
  'babel-runtime/regenerator',
  'babel-runtime/helpers/slicedToArray',
  'babel-runtime/helpers/asyncToGenerator',
  'babel-runtime/helpers/classCallCheck',
  'babel-runtime/helpers/createClass',
  'babel-runtime/helpers/toConsumableArray',
  'babel-runtime/helpers/toArray',
  'babel-runtime/helpers/typeof'
];