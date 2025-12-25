import { showCameraPreviewModal } from '../camera-preview-modal';
import { ModalService, LanguageService, cameraService, ToastService } from '@services/index';
import { logger } from '@shared/logger';

// Mock Services
vi.mock('@services/index', () => ({
  ModalService: {
    show: vi.fn(),
    dismissTop: vi.fn(),
  },
  LanguageService: {
    t: vi.fn((key) => key),
  },
  cameraService: {
    hasCameraAvailable: vi.fn(),
    getAvailableCameras: vi.fn(() => []),
    createVideoElement: vi.fn(() => document.createElement('video')),
    startStream: vi.fn(),
    stopStream: vi.fn(),
    attachStreamToVideo: vi.fn(),
    getTrackSettings: vi.fn(),
    captureFrame: vi.fn(),
  },
  ToastService: {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@shared/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('showCameraPreviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show warning if no camera available', async () => {
    vi.mocked(cameraService.hasCameraAvailable).mockReturnValue(false);

    await showCameraPreviewModal(vi.fn());

    expect(ToastService.warning).toHaveBeenCalled();
    expect(ModalService.show).not.toHaveBeenCalled();
  });

  it('should show modal if camera available', async () => {
    vi.mocked(cameraService.hasCameraAvailable).mockReturnValue(true);

    await showCameraPreviewModal(vi.fn());

    expect(ModalService.show).toHaveBeenCalled();
  });

  it('should start camera stream after delay', async () => {
    vi.mocked(cameraService.hasCameraAvailable).mockReturnValue(true);
    vi.mocked(cameraService.startStream).mockResolvedValue({} as MediaStream);

    await showCameraPreviewModal(vi.fn());

    vi.runAllTimers();

    expect(cameraService.startStream).toHaveBeenCalled();
  });

  it('should handle capture', async () => {
    vi.mocked(cameraService.hasCameraAvailable).mockReturnValue(true);
    vi.mocked(cameraService.startStream).mockResolvedValue({} as MediaStream);
    vi.mocked(cameraService.captureFrame).mockResolvedValue({
      image: new Image(),
      dataUrl: 'data:image/png;base64,',
      width: 640,
      height: 480,
    });

    const onCapture = vi.fn();
    await showCameraPreviewModal(onCapture);

    // Run timers to start camera
    vi.runAllTimers();
    await Promise.resolve();

    // Get the content passed to ModalService.show
    const options = vi.mocked(ModalService.show).mock.calls[0][0];
    const content = options.content as HTMLElement;
    const captureBtn = content.querySelector('#camera-capture-btn') as HTMLButtonElement;
    const video = content.querySelector('video') as HTMLVideoElement;

    // Simulate video playing to enable capture button
    video.dispatchEvent(new Event('playing'));

    expect(captureBtn.disabled).toBe(false);

    // Click capture
    captureBtn.click();

    // Wait for async handler
    await Promise.resolve();
    await Promise.resolve();

    expect(cameraService.captureFrame).toHaveBeenCalled();
    expect(onCapture).toHaveBeenCalled();
    expect(ModalService.dismissTop).toHaveBeenCalled();
  });

  it('should handle multiple cameras', async () => {
    vi.mocked(cameraService.hasCameraAvailable).mockReturnValue(true);
    vi.mocked(cameraService.getAvailableCameras).mockReturnValue([
      { deviceId: 'cam1', label: 'Camera 1', groupId: '1' },
      { deviceId: 'cam2', label: 'Camera 2', groupId: '2' },
    ]);

    await showCameraPreviewModal(vi.fn());

    // Run timers to start camera
    vi.runAllTimers();

    const options = vi.mocked(ModalService.show).mock.calls[0][0];
    const content = options.content as HTMLElement;
    const selector = content.querySelector('#camera-selector') as HTMLSelectElement;

    expect(selector).not.toBeNull();
    expect(selector.options.length).toBe(2);

    // Switch camera
    selector.value = 'cam2';
    selector.dispatchEvent(new Event('change'));

    // Wait for async handler (change handler chains onto cameraOperationPromise)
    await Promise.resolve();
    await Promise.resolve();

    expect(cameraService.stopStream).toHaveBeenCalled();
    expect(cameraService.startStream).toHaveBeenCalledWith('cam2');
  });

  it('should cleanup on close', async () => {
    vi.mocked(cameraService.hasCameraAvailable).mockReturnValue(true);

    await showCameraPreviewModal(vi.fn());

    expect(ModalService.show).toHaveBeenCalled();
    const options = vi.mocked(ModalService.show).mock.calls[0][0];

    // Ensure startStream runs to populate handlers (optional but good for coverage)
    vi.runAllTimers();

    // @ts-ignore
    options.onClose();

    expect(cameraService.stopStream).toHaveBeenCalled();
  });

  it('should handle cancel button click', async () => {
    vi.mocked(cameraService.hasCameraAvailable).mockReturnValue(true);

    await showCameraPreviewModal(vi.fn());

    const options = vi.mocked(ModalService.show).mock.calls[0][0];
    const content = options.content as HTMLElement;
    const buttons = content.querySelectorAll('button');
    const cancelBtn = Array.from(buttons).find(
      (b) => b.textContent?.includes('Cancel') || b.textContent?.includes('common.cancel')
    ) as HTMLButtonElement;

    expect(cancelBtn).not.toBeNull();
    cancelBtn.click();

    expect(cameraService.stopStream).toHaveBeenCalled();
    expect(ModalService.dismissTop).toHaveBeenCalled();
  });

  it('should handle camera stream error', async () => {
    vi.mocked(cameraService.hasCameraAvailable).mockReturnValue(true);
    vi.mocked(cameraService.startStream).mockRejectedValue(new Error('Permission denied'));

    await showCameraPreviewModal(vi.fn());

    vi.runAllTimers();
    await Promise.resolve();

    expect(logger.error).toHaveBeenCalledWith('Failed to start camera:', expect.any(Error));
  });

  it('should show track settings in status when available', async () => {
    vi.mocked(cameraService.hasCameraAvailable).mockReturnValue(true);
    vi.mocked(cameraService.startStream).mockResolvedValue({} as MediaStream);
    vi.mocked(cameraService.getTrackSettings).mockReturnValue({
      width: 1920,
      height: 1080,
    } as MediaTrackSettings);

    await showCameraPreviewModal(vi.fn());

    vi.runAllTimers();
    await Promise.resolve();

    const options = vi.mocked(ModalService.show).mock.calls[0][0];
    const content = options.content as HTMLElement;
    const video = content.querySelector('video') as HTMLVideoElement;

    // Trigger playing event
    video.dispatchEvent(new Event('playing'));

    // The status text should be updated with dimensions
    const statusText = content.querySelector('span.text-sm') as HTMLElement;
    expect(statusText.textContent).toBe('1920×1080');
  });

  it('should show default ready message when no track settings', async () => {
    vi.mocked(cameraService.hasCameraAvailable).mockReturnValue(true);
    vi.mocked(cameraService.startStream).mockResolvedValue({} as MediaStream);
    vi.mocked(cameraService.getTrackSettings).mockReturnValue(null);

    await showCameraPreviewModal(vi.fn());

    vi.runAllTimers();
    await Promise.resolve();

    const options = vi.mocked(ModalService.show).mock.calls[0][0];
    const content = options.content as HTMLElement;
    const video = content.querySelector('video') as HTMLVideoElement;

    // Trigger playing event
    video.dispatchEvent(new Event('playing'));

    const statusText = content.querySelector('span.text-sm') as HTMLElement;
    expect(statusText.textContent).toBe('camera.ready');
  });

  it('should handle video loadedmetadata event', async () => {
    vi.mocked(cameraService.hasCameraAvailable).mockReturnValue(true);
    vi.mocked(cameraService.startStream).mockResolvedValue({} as MediaStream);

    await showCameraPreviewModal(vi.fn());

    vi.runAllTimers();
    await Promise.resolve();

    const options = vi.mocked(ModalService.show).mock.calls[0][0];
    const content = options.content as HTMLElement;
    const video = content.querySelector('video') as HTMLVideoElement;

    // Mock play method
    const playSpy = vi.spyOn(video, 'play').mockResolvedValue(undefined);

    // Trigger loadedmetadata event
    video.dispatchEvent(new Event('loadedmetadata'));

    expect(playSpy).toHaveBeenCalled();
  });

  it('should warn if video play fails', async () => {
    vi.mocked(cameraService.hasCameraAvailable).mockReturnValue(true);
    vi.mocked(cameraService.startStream).mockResolvedValue({} as MediaStream);

    await showCameraPreviewModal(vi.fn());

    vi.runAllTimers();
    await Promise.resolve();

    const options = vi.mocked(ModalService.show).mock.calls[0][0];
    const content = options.content as HTMLElement;
    const video = content.querySelector('video') as HTMLVideoElement;

    // Mock play method to reject
    vi.spyOn(video, 'play').mockRejectedValue(new Error('Autoplay blocked'));

    // Trigger loadedmetadata event
    video.dispatchEvent(new Event('loadedmetadata'));

    // Wait for promise rejection to be handled
    await Promise.resolve();

    expect(logger.warn).toHaveBeenCalledWith('Video play failed:', expect.any(Error));
  });

  it('should handle capture failure', async () => {
    vi.mocked(cameraService.hasCameraAvailable).mockReturnValue(true);
    vi.mocked(cameraService.startStream).mockResolvedValue({} as MediaStream);
    vi.mocked(cameraService.captureFrame).mockRejectedValue(new Error('Capture failed'));

    const onCapture = vi.fn();
    await showCameraPreviewModal(onCapture);

    vi.runAllTimers();
    await Promise.resolve();

    const options = vi.mocked(ModalService.show).mock.calls[0][0];
    const content = options.content as HTMLElement;
    const captureBtn = content.querySelector('#camera-capture-btn') as HTMLButtonElement;
    const video = content.querySelector('video') as HTMLVideoElement;

    // Enable capture button
    video.dispatchEvent(new Event('playing'));

    // Click capture
    captureBtn.click();

    // Wait for async handler
    await Promise.resolve();
    await Promise.resolve();

    expect(logger.error).toHaveBeenCalledWith('Capture failed:', expect.any(Error));
    expect(ToastService.error).toHaveBeenCalled();
    expect(onCapture).not.toHaveBeenCalled();
    expect(captureBtn.disabled).toBe(false);
  });

  it('should stop stream if modal closed during camera start', async () => {
    vi.mocked(cameraService.hasCameraAvailable).mockReturnValue(true);

    // Create a promise we can control
    let resolveStream: (stream: MediaStream) => void;
    const streamPromise = new Promise<MediaStream>((resolve) => {
      resolveStream = resolve;
    });
    vi.mocked(cameraService.startStream).mockReturnValue(streamPromise);

    await showCameraPreviewModal(vi.fn());

    const options = vi.mocked(ModalService.show).mock.calls[0][0];

    // Run timer to trigger startCamera
    vi.runAllTimers();

    // Close modal while stream is starting
    // @ts-ignore
    options.onClose();

    // Now resolve the stream
    resolveStream!({} as MediaStream);
    await Promise.resolve();

    // Stream should be stopped because modal was closed
    expect(cameraService.stopStream).toHaveBeenCalled();
  });
});
