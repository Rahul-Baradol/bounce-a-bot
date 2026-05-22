import EventEmitter from "eventemitter3";

export class SDKStream extends EventEmitter {
  abortController: AbortController;

  constructor(controller: AbortController) {
    super();

    this.abortController = controller;
  }

  cancel() {
    this.abortController.abort();
  }
}