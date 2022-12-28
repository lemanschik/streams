// import { declareFunctionAsTransformStream } from 'direktspeed/nils'
// declareFunctionAsTransformStream(JSON.parse);
parseJSON() { return new TransformStream({ transform(chunk, controller) {
      controller.enqueue(JSON.parse(chunk));
} }); };
