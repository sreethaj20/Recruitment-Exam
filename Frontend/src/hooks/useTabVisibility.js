import { useState, useEffect } from 'react';

const useTabVisibility = (onViolation) => {
    const [violationCount, setViolationCount] = useState(0);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setViolationCount(prev => {
                    const newCount = prev + 1;
                    if (onViolation) onViolation(newCount);
                    return newCount;
                });
            }
        };

        const handleBlur = () => {
            // Also detect when window loses focus (e.g., clicking on another app)
            setViolationCount(prev => {
                const newCount = prev + 1;
                if (onViolation) onViolation(newCount);
                return newCount;
            });
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
        };
    }, [onViolation]);

    return violationCount;
};

export default useTabVisibility;
