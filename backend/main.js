const worker = new Worker('worker.js');

worker.postMessage('Start work');

worker.onmessage = (event) => {
  console.log(`Received message from worker: ${event.data}`);
};

worker.onerror = (error) => {
  console.log(`Error occurred in worker: ${error.message}`);
};
