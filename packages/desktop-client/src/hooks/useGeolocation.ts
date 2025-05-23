import { useEffect, useState } from 'react';

export function useGeolocation() {
  const [coordinates, setCoordinates] = useState<GeolocationCoordinates | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isUnmounted = false;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async position => {
          if (!isUnmounted) {
            setCoordinates(position.coords);
          }
        },
        error => {
          if (!isUnmounted) {
            console.log(
              `Error occurred while getting geolocation: ${error.message}`,
            );
            setError(error.message);
          }
        },
      );
    } else {
      if (!isUnmounted) {
        setError('Geolocation is not supported by this browser.');
      }
    }
    return () => {
      isUnmounted = true;
    };
  }, []);

  return {
    coordinates,
    error,
  };
}
