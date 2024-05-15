import { randomUUID } from 'crypto';

import { ClipType } from 'constants/videoTemplate.js';
import type { Row } from './types.js';

export default function createVideoTemplates(
  { fps, resolution, time }: Row,
  id: number,
) {
  const permanentId = `${id}__${randomUUID()}`;
  const rectWidth = 0.4 * resolution[0];
  const rectHeight = 0.4 * resolution[1];
  const gapFromEdge = resolution[0] / 64;
  const fontSize = resolution[0] / 17;

  return {
    tracks: [
      {
        id: '4419f227-d609-4b9d-a1e2-11a613222923',
        clips: [
          {
            id: 'ab96b4794e-f9b3-4560-961e-a9950cf14376',
            type: ClipType.IMAGE_CLIP,
            startOffSet: 0,
            duration: time,
            endOffSet: 10000,
            coordinates: {
              x: resolution[0] / 2,
              y: resolution[1] / 2,
              width: resolution[0],
              height: resolution[1],
            },
            sourceUrl:
              'http://localhost:8626/remote/ab96b4794e-f9b3-4560-961e-a9950cf14376.jpg',
            opacity: 1,
            rotationAngle: 0,
            dynamicImageEnabled: false,
          },
        ],
      },
      {
        id: '8643db80-a889-4d55-bb61-831a1151956a',
        clips: [
          {
            id: 'ab106b4794e-f9b3-4560-961e-a9950cf14376',
            type: ClipType.VIDEO_CLIP,
            startOffSet: 0,
            trimOffset: 0,
            duration: time,
            endOffSet: 2000,
            coordinates: {
              x: rectWidth / 2 + gapFromEdge,
              y: rectHeight / 2 + gapFromEdge,
              width: rectWidth,
              height: rectHeight,
            },
            sourceUrl:
              'http://localhost:8626/remote/ab106b4794e-f9b3-4560-961e-a9950cf14376.mp4',
            opacity: 1,
            rotationAngle: 0,
            dynamicVideoEnabled: false,
            dynamicAudioEnabled: false,
            audioProperties: {
              fadeIn: 2,
              fadeOut: 2,
              volume: 0.75,
            },
          },
        ],
      },
      {
        id: '44f3a965-19a2-4e4a-9d18-284424de4ec6',
        clips: [
          {
            id: 'ab206b4794e-f9b3-4560-961e-a9950cf14376',
            type: ClipType.VIDEO_CLIP,
            startOffSet: 0,
            trimOffset: 1000,
            duration: time,
            endOffSet: 4000,
            coordinates: {
              x: resolution[0] - rectWidth / 2 - gapFromEdge,
              y: resolution[1] - rectHeight / 2 - gapFromEdge,
              width: rectWidth,
              height: rectHeight,
            },
            sourceUrl: `http://localhost:8626/remote/ab206b4794e-f9b3-4560-961e-a9950cf14376.mp4`,
            opacity: 1,
            rotationAngle: 0,
            dynamicVideoEnabled: false,
            dynamicAudioEnabled: false,
            audioProperties: {
              fadeIn: 2,
              fadeOut: 2,
              volume: 0.75,
            },
          },
        ],
      },
      {
        id: 'ca898122-6cbe-4d2f-954c-b75ed823dc32',
        clips: [
          {
            id: '20338a9f-430a-42f3-b319-bb65997f984a',
            type: ClipType.VIDEO_CLIP,
            startOffSet: 0,
            duration: time,
            endOffSet: 60000,
            coordinates: {
              x: resolution[0] - rectWidth / 2 - gapFromEdge,
              y: rectHeight / 2 + gapFromEdge,
              width: rectWidth,
              height: rectHeight,
            },
            sourceUrl: `http://localhost:8626/remote/20338a9f-430a-42f3-b319-bb65997f984a.mp4`,
            opacity: 1,
            rotationAngle: 0,
            dynamicVideoEnabled: false,
            dynamicAudioEnabled: false,
            audioProperties: {
              fadeIn: 2,
              fadeOut: 2,
              volume: 0.75,
            },
          },
        ],
      },
      {
        id: 'a2dad895-8b8b-4e53-adbf-dc6f1941d1cb',
        clips: [
          {
            id: '735780c9-b914-4ee9-86b5-738d7b422b9a',
            type: ClipType.TEXT_CLIP,
            startOffSet: 0,
            duration: time,
            endOffSet: 12651,
            coordinates: {
              x: resolution[0] / 2,
              y: resolution[1] / 2,
              width: resolution[0] / 2,
              height: resolution[1] / 2,
            },
            opacity: 1,
            rotationAngle: 0,
            htmlContent: `<div style="width: ${resolution[0] / 2}px; height: ${
              resolution[1] / 2
            }px; word-break: break-word; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 14px; background-color: #00000000;" data-entityid="text-layer-container"><div style="width: 100%"><p style="margin-bottom: 0px; margin-top: 0px; font-family: Abril Fatface; line-height: 1.2"><span style="font-family: Roboto; display: block; text-align: center; width: 100%; color: rgb(255, 255, 254); font-size: ${fontSize}px; letter-spacing: 10px">The text and color</span></p></div></div>`,
            verticalAlignment: 'TOP',
            placeholders: [],
            backgroundColor: '#00000000',
            dynamicBackgroundColorEnabled: false,
          },
        ],
      },
      {
        id: '5c66ea63-73ea-4dcd-9864-c17b84f4b8f3',
        clips: [
          {
            id: '29667abd-edb7-4043-8ca3-5accd6481f41',
            type: ClipType.SHAPE_CLIP,
            startOffSet: 0,
            duration: time,
            endOffSet: 15000,
            coordinates: {
              x: (Math.pow(2, 0.5) * rectWidth) / 4 + gapFromEdge,
              y:
                resolution[1] -
                (Math.pow(2, 0.5) * rectWidth) / 4 -
                gapFromEdge,
              width: rectWidth / 2,
              height: rectWidth / 2,
            },
            opacity: 0.5,
            rotationAngle: 45,
            shapeInfo: {
              color: '#25b577ff',
              strokeWeight: 0,
              strokeColor: '#8d8d8dff',
              borderRadius: 0,
              shapeMediaUrl:
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0CAYAAAA9zQYyAAAAAXNSR0IArs4c6QAAA2NJREFUeF7t0gENACAMBDEQg0aUoQ8SZFw6B7vvXGff4RSIFJhAR5b0xi8ANAipAkCn5vQM0AykCgCdmtMzQDOQKgB0ak7PAM1AqgDQqTk9AzQDqQJAp+b0DNAMpAoAnZrTM0AzkCoAdGpOzwDNQKoA0Kk5PQM0A6kCQKfm9AzQDKQKAJ2a0zNAM5AqAHRqTs8AzUCqANCpOT0DNAOpAkCn5vQM0AykCgCdmtMzQDOQKgB0ak7PAM1AqgDQqTk9AzQDqQJAp+b0DNAMpAoAnZrTM0AzkCoAdGpOzwDNQKoA0Kk5PQM0A6kCQKfm9AzQDKQKAJ2a0zNAM5AqAHRqTs8AzUCqANCpOT0DNAOpAkCn5vQM0AykCgCdmtMzQDOQKgB0ak7PAM1AqgDQqTk9AzQDqQJAp+b0DNAMpAoAnZrTM0AzkCoAdGpOzwDNQKoA0Kk5PQM0A6kCQKfm9AzQDKQKAJ2a0zNAM5AqAHRqTs8AzUCqANCpOT0DNAOpAkCn5vQM0AykCgCdmtMzQDOQKgB0ak7PAM1AqgDQqTk9AzQDqQJAp+b0DNAMpAoAnZrTM0AzkCoAdGpOzwDNQKoA0Kk5PQM0A6kCQKfm9AzQDKQKAJ2a0zNAM5AqAHRqTs8AzUCqANCpOT0DNAOpAkCn5vQM0AykCgCdmtMzQDOQKgB0ak7PAM1AqgDQqTk9AzQDqQJAp+b0DNAMpAoAnZrTM0AzkCoAdGpOzwDNQKoA0Kk5PQM0A6kCQKfm9AzQDKQKAJ2a0zNAM5AqAHRqTs8AzUCqANCpOT0DNAOpAkCn5vQM0AykCgCdmtMzQDOQKgB0ak7PAM1AqgDQqTk9AzQDqQJAp+b0DNAMpAoAnZrTM0AzkCoAdGpOzwDNQKoA0Kk5PQM0A6kCQKfm9AzQDKQKAJ2a0zNAM5AqAHRqTs8AzUCqANCpOT0DNAOpAkCn5vQM0AykCgCdmtMzQDOQKgB0ak7PAM1AqgDQqTk9AzQDqQJAp+b0DNAMpAoAnZrTM0AzkCoAdGpOzwDNQKoA0Kk5PQM0A6kCQKfm9AzQDKQKAJ2a0zNAM5AqAHRqTs8AzUCqANCpOT0DNAOpAkCn5vQM0AykCgCdmtMzQDOQKgB0ak7PAM1AqgDQqTk9AzQDqQJAp+b0zANuXqEEcIDBZQAAAABJRU5ErkJggg==',
            },
            dynamicFillColorEnabled: false,
            dynamicBorderColorEnabled: false,
          },
        ],
      },
    ],
    videoProperties: {
      duration: time,
      frameRate: fps,
      height: resolution[1],
      width: resolution[0],
      backgroundColor: '#000',
    },
    tmpDirPath: '',
    variationId: permanentId,
    variationName: `video_${time}_${permanentId}`,
  };
}
