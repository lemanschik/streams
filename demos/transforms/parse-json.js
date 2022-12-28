// import { declareFunctionAsTransformStream } from 'direktspeed/nils'
// declareFunctionAsTransformStream(JSON.parse);
export const parseJSON() => new TransformStream({ transform(chunk, controller) {
      controller.enqueue(JSON.parse(chunk));
 }); };
