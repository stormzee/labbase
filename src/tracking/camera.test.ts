import { describe, expect, it, vi } from 'vitest';
import {
  CameraError,
  cameraConstraints,
  mapCameraError,
  requestCameraStream,
  type MediaDevicesLike,
} from '../tracking/camera';
import { HandTracker } from '../tracking/HandTracker';

const fakeVideo = () => {
  const video = {
    srcObject: null as MediaStream | null,
    muted: false,
    playsInline: false,
    readyState: 2,
    currentTime: 0,
    videoWidth: 640,
    videoHeight: 480,
    play: vi.fn(async () => {}),
  };
  return video as unknown as HTMLVideoElement;
};

const fakeStream = () => {
  const track = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    stop: vi.fn(),
  };
  const stream = {
    getVideoTracks: () => [track],
    getTracks: () => [track],
  };
  return { stream: stream as unknown as MediaStream, track };
};

describe('camera permission and failure handling', () => {
  it('maps permission denial into an actionable error', () => {
    const error = mapCameraError({ name: 'NotAllowedError', message: 'Permission denied' });
    expect(error).toBeInstanceOf(CameraError);
    expect(error.code).toBe('denied');
    expect(error.hint).toMatch(/allow camera/i);
  });

  it('maps missing, busy and unsupported camera cases', () => {
    expect(mapCameraError({ name: 'NotFoundError', message: 'none' }).code).toBe('not-found');
    expect(mapCameraError({ name: 'NotReadableError', message: 'busy' }).code).toBe('in-use');
    expect(mapCameraError({ name: 'SecurityError', message: 'http' }).code).toBe('security');
    expect(mapCameraError({ name: 'OverconstrainedError', message: 'res' }).code).toBe('constraints');
    expect(mapCameraError({ name: 'WeirdError', message: '?' }).code).toBe('unknown');
  });

  it('reports unsupported when getUserMedia is missing', async () => {
    await expect(requestCameraStream({}, { width: 640, height: 480 })).rejects.toMatchObject({
      code: 'unsupported',
    });
    await expect(requestCameraStream(null, { width: 640, height: 480 })).rejects.toMatchObject({
      code: 'unsupported',
    });
  });

  it('requests a front-facing, audio-free stream', async () => {
    const getUserMedia = vi.fn(async () => fakeStream().stream);
    const devices: MediaDevicesLike = { getUserMedia };
    const stream = await requestCameraStream(devices, { width: 960, height: 540 });
    expect(stream).toBeTruthy();
    const constraints = cameraConstraints({ width: 960, height: 540 });
    expect(constraints.audio).toBe(false);
    expect(getUserMedia).toHaveBeenCalledWith(constraints);
    expect((constraints.video as MediaTrackConstraints).facingMode).toBe('user');
  });

  it('turns a denied getUserMedia promise into a CameraError', async () => {
    const devices: MediaDevicesLike = {
      getUserMedia: async () => {
        throw new DOMException('Permission denied', 'NotAllowedError');
      },
    };
    await expect(requestCameraStream(devices, { width: 640, height: 480 })).rejects.toMatchObject({
      code: 'denied',
    });
  });

  it('stops cleanly and reports denied from HandTracker.start', async () => {
    const statuses: string[] = [];
    const tracker = new HandTracker({
      requestStream: async () => {
        throw new CameraError('denied', 'Permission denied', 'Allow the camera.');
      },
    });
    await expect(
      tracker.start(fakeVideo(), {
        width: 640,
        height: 480,
        onStatus: (status) => statuses.push(status),
      }),
    ).rejects.toMatchObject({ code: 'denied' });
    expect(statuses).toEqual(['requesting']);
    expect(tracker.isRunning).toBe(false);
  });

  it('runs inference only for new video frames and mirrors landmarks', async () => {
    const { stream } = fakeStream();
    const detectForVideo = vi.fn(() => ({
      landmarks: [[{ x: 0.2, y: 0.3, z: 0 }]],
    }));
    const tracker = new HandTracker({
      requestStream: async () => stream,
      createLandmarker: async () => ({
        landmarker: { detectForVideo, close: vi.fn() },
        delegate: 'CPU',
      }),
    });
    const video = fakeVideo();
    await tracker.start(video, { width: 640, height: 480 });
    expect(tracker.isRunning).toBe(true);
    video.currentTime = 1;
    const result = tracker.detect(1000);
    expect(result?.hands[0][0]).toMatchObject({ x: 0.8, y: 0.3 });
    expect(detectForVideo).toHaveBeenCalledTimes(1);
    expect(tracker.detect(1010)).toBeNull();
    video.currentTime = 2;
    tracker.detect(1020);
    expect(detectForVideo).toHaveBeenCalledTimes(2);
    tracker.stop();
    expect(video.srcObject).toBeNull();
    expect(tracker.isRunning).toBe(false);
  });

  it('skips camera frames in performance mode', async () => {
    const { stream } = fakeStream();
    const detectForVideo = vi.fn(() => ({ landmarks: [] }));
    const tracker = new HandTracker({
      requestStream: async () => stream,
      createLandmarker: async () => ({
        landmarker: { detectForVideo, close: vi.fn() },
        delegate: 'CPU',
      }),
    });
    const video = fakeVideo();
    await tracker.start(video, { width: 640, height: 480, frameSkip: 2 });
    video.currentTime = 1;
    expect(tracker.detect(1)).toBeNull();
    video.currentTime = 2;
    expect(tracker.detect(2)).not.toBeNull();
    tracker.stop();
  });

  it('never sends webcam data over the network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(''));
    const { stream } = fakeStream();
    const tracker = new HandTracker({
      requestStream: async () => stream,
      createLandmarker: async () => ({
        landmarker: { detectForVideo: () => ({ landmarks: [] }), close: vi.fn() },
        delegate: 'GPU',
      }),
    });
    const video = fakeVideo();
    await tracker.start(video, { width: 640, height: 480 });
    video.currentTime = 1;
    tracker.detect(1);
    tracker.stop();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
