import { useState, useEffect, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { db } from '../db';

export function useFaceRecognition() {
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = '/models';
            try {
                // vladmandic face-api uses slightly different names or can load .bin files directly
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);
                setModelsLoaded(true);
                console.log('Face-api models loaded (TinyFaceDetector)');
            } catch (err) {
                console.error('Error loading face-api models:', err);
            }
        };
        loadModels();
    }, []);

    const refreshFaceMatcher = useCallback(async () => {
        const users = await db.users.toArray();
        if (users.length === 0) {
            setFaceMatcher(null);
            return;
        }

        const labeledDescriptors = users.map(user => {
            // Convert any legacy single descriptors or use the new array
            const descriptors = Array.isArray(user.faceDescriptors)
                ? user.faceDescriptors.map(d => d instanceof Float32Array ? d : new Float32Array(Object.values(d)))
                : [(user as any).faceDescriptor].filter(Boolean).map(d => d instanceof Float32Array ? d : new Float32Array(Object.values(d)));

            return new faceapi.LabeledFaceDescriptors(
                user.id!.toString(),
                descriptors
            );
        });

        if (labeledDescriptors.length > 0) {
            setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.6));
        } else {
            setFaceMatcher(null);
        }
    }, []);

    useEffect(() => {
        if (modelsLoaded) {
            refreshFaceMatcher();
        }
    }, [modelsLoaded, refreshFaceMatcher]);

    const detectFace = useCallback(async (videoElement: HTMLVideoElement) => {
        if (!modelsLoaded) return null;

        const detection = await faceapi
            .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions({
                inputSize: 320,
                scoreThreshold: 0.5
            }))
            .withFaceLandmarks()
            .withFaceDescriptor();

        return detection;
    }, [modelsLoaded]);

    const matchFace = useCallback((descriptor: Float32Array) => {
        if (!faceMatcher) return null;
        const bestMatch = faceMatcher.findBestMatch(descriptor);
        return bestMatch;
    }, [faceMatcher]);

    return {
        modelsLoaded,
        detectFace,
        matchFace,
        refreshFaceMatcher,
    };
}
