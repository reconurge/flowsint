'use client';
import { ExpandIcon, ShrinkIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
export default function FullscreenButton() {
    const [isFullscreen, setIsFullscreen] = useState(false);
    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', onFullscreenChange);
        };
    }, []);
    const enterFullscreen = () => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
            (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).msRequestFullscreen) {
            (elem as any).msRequestFullscreen();
        }
    };
    const exitFullscreen = () => {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
            (document as any).msExitFullscreen();
        }
    };
    return (
        <Button onClick={isFullscreen ? exitFullscreen : enterFullscreen}
            variant={"outline"} size="icon">
            {isFullscreen ? <ShrinkIcon /> : <ExpandIcon />}
        </Button>

    );
}
