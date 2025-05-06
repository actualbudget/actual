import { useEffect, useState } from 'react';

export function useGeolocation() {
  const [coordinates, setCoordinates] = useState<GeolocationCoordinates>(null);
  const [error, setError] = useState<string>(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async position => {
          setCoordinates(position.coords);
        },
        error => {
          console.log(
            `Error occurred while getting geolocation: ${error.message}`,
          );
          setError(error.message);
        },
      );
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  }, []);

  return {
    coordinates,
    error,
  };
}
