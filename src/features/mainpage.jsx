import React, { useState, useEffect, useRef } from "react";
import { GoogleMap, useLoadScript, GroundOverlay } from "@react-google-maps/api";
import { initializeApp } from "firebase/app";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { fromArrayBuffer } from 'geotiff';
import { useParams } from "react-router-dom";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_APIKEY,
  authDomain: import.meta.env.VITE_AUTHDOMAIN,
  projectId: import.meta.env.VITE_PROJECTID,
  storageBucket: import.meta.env.VITE_STORAGEBUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGINGSENDERID,
  appId: import.meta.env.VITE_APPID
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

const containerStyle = {
  width: "100%",
  height: "100%",
};

function MapWithTiffOverlay() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_MAPS_APIKEY,
  });

  const { city, mode } = useParams();

  const [tiffUrl, setTiffUrl] = useState(null);
  const [bounds, setBounds] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: -6.2, lng: 106.816666 });
  const [overlayUrl, setOverlayUrl] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const getFilesFromFirebase = async () => {
      try {
        const capitalizedCity = city.charAt(0).toUpperCase() + city.slice(1);
        const baseName = `${capitalizedCity}/${mode}`;
        const tifRef = ref(storage, `${baseName}.tif`);
        const pngRef = ref(storage, `${baseName}.png`);

        const [tifUrl, pngUrl] = await Promise.all([
          getDownloadURL(tifRef),
          getDownloadURL(pngRef)
        ]);

        // Fetch and parse GeoTIFF for bounds
        const response = await fetch(tifUrl);
        if (!response.ok) throw new Error('Failed to download GeoTIFF file');
        const arrayBuffer = await response.arrayBuffer();
        const tiff = await fromArrayBuffer(arrayBuffer);
        const image = await tiff.getImage();

        const [west, south, east, north] = image.getBoundingBox();
        setBounds({ west, south, east, north });

        const midLat = (north + south) / 2;
        const midLng = (east + west) / 2;
        setMapCenter({ lat: midLat, lng: midLng });

        // Fetch the PNG image and process it to remove white color
        const pngResponse = await fetch(pngUrl);
        if (!pngResponse.ok) throw new Error('Failed to download PNG file');
        const pngBlob = await pngResponse.blob();
        const pngImage = await createImageBitmap(pngBlob);

        // Create a canvas to process the image
        const canvas = document.createElement('canvas');
        canvas.width = pngImage.width;
        canvas.height = pngImage.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(pngImage, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Iterate through each pixel and make white pixels transparent
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // If the pixel is white, set alpha to 0
          if (r === 255 && g === 255 && b === 255) {
            data[i + 3] = 0;
          }
        }

        // Update the canvas with the modified image data
        ctx.putImageData(imageData, 0, 0);

        // Convert the canvas to a data URL and set it as the overlay URL
        const processedPngUrl = canvas.toDataURL();
        setOverlayUrl(processedPngUrl);

      } catch (error) {
        console.error("Error loading files:", error);
      }
    };

    getFilesFromFirebase();

    return () => {
      if (overlayUrl) {
        URL.revokeObjectURL(overlayUrl);
      }
    };
  }, [city, mode]);

  if (!isLoaded) {
    return <div>Loading Google Maps...</div>;
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={10}
        onLoad={(map) => {
          mapRef.current = map;
        }}
      >
        {bounds && overlayUrl && (
          <GroundOverlay
            url={overlayUrl}
            bounds={{
              north: bounds.north,
              south: bounds.south,
              east: bounds.east,
              west: bounds.west
            }}
            opacity={0.3}
          />
        )}
      </GoogleMap>
    </div>
  );
}

export default MapWithTiffOverlay;