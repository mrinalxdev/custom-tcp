self.onmessage = (event) => {
  if (event.data === "Start work") {
    console.log("Worker started");
    // Perform some work
    const result = performWork();
    self.postMessage(`Work result: ${result}`);
  }
};

function performWork() {
  let sum = 0;
  for (let i = 0; i < 100000000; i++) {
    sum += i;
  }
  return sum;
}
