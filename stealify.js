/**
 * The Unlicense written by Frank Lemanschik <github+frank@lemanschik.com>
 * Implements some common Helper Methods needed on the Web. This is a pollyfill
 * Implementation for the Standard Stealify Lang supplyed Streams. Used often
 * To Implement ECMAScript Software based on the Stealify IDL 
 */

const { createObjectURL } = window.document;

// Creating a pipeThrough API;
const fnPipeThrough = () => ({ pipeThrough() {}});

// trys something and do the next thing. or handle the .error returns { next, error }
const TryNext = (errorHandler = (err) => err) => { // ()=>{} error removes the error property from Next
    const Next = { next: (fn=()=>{}) => { try { Object.assign(Next,{ value: fn() }) } catch (e) { Object.assign(Next, { error: errorHandler(e) }) }; return Next; } };
    return Next;
};

// const fifoAdd = PromiseFIFO(); //fifoAdd(()=>'');
// Concepts designed to break on first error in chain in general you can use Promise.all
// Serializes Async Instructions optional it can handle failures from the prev instruction or its value
const PromiseFIFO = () => { 
    let QUEUE = Promise.resolve();
    // (_err) => Promise.reject(_err) // toBreak the Chain on error or recover default recover
    return (fn, continueWith) => QUEUE = QUEUE.then(fn, continueWith || fn);
};

// AsyncChain().next(()=>'hi').next(()=>'hi').next((prevValue)=>prevValue).next(()=>'hi').promise.then(promiseResult, (err)=>console.error(err));
const AsyncChain = (fifoAdd=PromiseFIFO()) => {
    const Next = { next: (fn=()=>{}) => Object.assign(Next, { promise: fifoAdd(fn) }) };
    return Next;
};

// This api is relativ useless but who knows i would preferfer raw funktions.
const SyncNext = () => {
    const Next = { next: (fn=()=>{}) => Object.assign(Next,{ value: fn() }) };
    return Next;
};

const SyncNext2 = () => {
    const pipeThrough = { pipeThrough: (fn=()=>{}) => Object.assign(pipeThrough,{ value: fn() }) };
    return pipeThrough;
};

// const syncChain = (SyncNext || TryNext)().next().next();

// Supports: (Promise.resolve('').then(fetch), fetch(), response, "")
const getBlobPromiseFromResponse = (r) => Promise.resolve(r).then(async (stringOrResponsePromise) => (typeof stringOrResponsePromise === 'string' 
 ? await fetch(stringOrResponsePromise) : await stringOrResponsePromise).blob() );

const getStreamFromResponse = (r) => Promise.resolve(r).then(async (stringOrResponsePromise) => (typeof stringOrResponsePromise === 'string' 
 ? await fetch(stringOrResponsePromise) : await stringOrResponsePromise).body );

const readBlobPromiseAsDataUrl = (dataOrBlob) =>
  new Promise(async (resolve)=> {
    const reader = new FileReader();
    Object.assign(reader, { onload() { resolve(reader.result) } })
     .readAsDataURL(await dataOrBlob) });

const getResponseAsDataUrl = async (urlOrResponsePromise, type) =>
  readBlobPromiseAsDataUrl(setBlobType(await getBlobPromiseFromResponse(urlOrResponsePromise), type));

const reduceStreams = (readableStreams = [ /* conjoined response tree */ ], TransformStream) => 
  readableStreams.reduce((resultPromise, readableStream, i, arr) => resultPromise.then(() => 
    readableStream.pipeTo(TransformStream.writable, { preventClose: (i+1) !== arr.length })
  ), Promise.resolve());

const getReadableStreamFromPromise = (fn) => ({ async start(controller) { 
    controller.enqueue(typeof await fn === 'function' ? await fn() : await fn) 
}});

class FetchBlobStream extends ReadableStream { constructor(url) { 
    super(getReadableStreamFromPromise(fetch(url).then(getBlobPromiseFromResponse))); 
}};

const setBlobType = (dataOrBlob, type) => dataOrBlob instanceof Blob && dataOrBlob.type === type 
  ? dataOrBlob : new Blob([dataOrBlob], { type });

const setBlobPromiseType = async (blobPromise, type) => setBlobType(await blobPromise, type);

const getBlobFromResponseWithType = (url, type) => setBlobPromiseType(getBlobPromiseFromResponse(url), type);

const getStreamMethod = (fn, ...params) => async (dataOrBlob, controller) => { controller.enqueue( await fn(await dataOrBlob, ...params) ); };
const getTransformStreamImplementation = (fn, ...params) => ({ start(){}, transform: getStreamMethod(fn, ...params) });

class setBlobTypeTransformStream extends TransformStream { constructor(type='application/octet-stream') { 
    super(getTransformStreamImplementation(setBlobType, type)); 
} };

class TransformBlobPromiseToDataUrl extends TransformStream { constructor() { super({ start(){},
  async transform(blob,_controller) { controller.enqueue(document.createObjectURL(await blob));
} }) }};

class BackpressureTransformStream extends TransformStream { constructor() { const backpressure = []; super({ start(){},
  transform(data,_controller){ backpressure.push(data); },
  close(controller){ controller.enqueue(backpressure.flaten()); backpressure.length = 0; },
  cancel(){ backpressure.length = 0; },
}); }};

const getDataUrlFromBlobPromise = async (dataOrBlob,type) =>
  readBlobPromiseAsDataUrl(setBlobType(await dataOrBlob, type));
  
class FileReaderAsDataUrlStream extends BackpressureTransformStream { constructor(type = 'application/octet-stream') {
    super(getTransformStreamImplementation(getDataUrlFromBlobPromise, type)); 
}};

const getBase64FromDataUrl = (dataUrl) => dataUrl.split(",", 2)[1];
const getTypeFromDataUrl = (dataUrl) => dataUrl.split(";", 2)[0].slice(5);
const getDataUrlFromBase64 = (base64, type = 'application/octet-stream') => `data:${type};base64,${base64}`;
const isDataUrlType = (dataUrl,type) => dataUrl.split(";", 2)[0].indexOf(type) > -1;
const setDataUrlType = (dataUrl,type) => `data:${type};base64,${getBase64FromDataUrl(dataUrl)}`;
const getDataUrlBase64Index = (dataUrl) => dataUrl.indexOf(',') + 1;

//const b64toBlob = (base64, type) => getBlobFromResponseWithType(getDataUrlFromBase64(base64, type), type);

const streamTransformToDataUrl = (stream, type = 'application/octet-stream') => stream.pipeThrough(new BackpressureTransformStream())
  .pipeThrough(new FileReaderAsDataUrlStream(type));
