'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.WorkerStates =
  exports.WorkerEvents =
  exports.PARENT_MESSAGE_SETUP_ERROR =
  exports.PARENT_MESSAGE_OK =
  exports.PARENT_MESSAGE_MEM_USAGE =
  exports.PARENT_MESSAGE_CUSTOM =
  exports.PARENT_MESSAGE_CLIENT_ERROR =
  exports.CHILD_MESSAGE_MEM_USAGE =
  exports.CHILD_MESSAGE_INITIALIZE =
  exports.CHILD_MESSAGE_END =
  exports.CHILD_MESSAGE_CALL =
    void 0;

/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// Because of the dynamic nature of a worker communication process, all messages
// coming from any of the other processes cannot be typed. Thus, many types
// include "unknown" as a TS type, which is (unfortunately) correct here.
const CHILD_MESSAGE_INITIALIZE = 0;
exports.CHILD_MESSAGE_INITIALIZE = CHILD_MESSAGE_INITIALIZE;
const CHILD_MESSAGE_CALL = 1;
exports.CHILD_MESSAGE_CALL = CHILD_MESSAGE_CALL;
const CHILD_MESSAGE_END = 2;
exports.CHILD_MESSAGE_END = CHILD_MESSAGE_END;
const CHILD_MESSAGE_MEM_USAGE = 3;
exports.CHILD_MESSAGE_MEM_USAGE = CHILD_MESSAGE_MEM_USAGE;
const PARENT_MESSAGE_OK = 0;
exports.PARENT_MESSAGE_OK = PARENT_MESSAGE_OK;
const PARENT_MESSAGE_CLIENT_ERROR = 1;
exports.PARENT_MESSAGE_CLIENT_ERROR = PARENT_MESSAGE_CLIENT_ERROR;
const PARENT_MESSAGE_SETUP_ERROR = 2;
exports.PARENT_MESSAGE_SETUP_ERROR = PARENT_MESSAGE_SETUP_ERROR;
const PARENT_MESSAGE_CUSTOM = 3;
exports.PARENT_MESSAGE_CUSTOM = PARENT_MESSAGE_CUSTOM;
const PARENT_MESSAGE_MEM_USAGE = 4;
exports.PARENT_MESSAGE_MEM_USAGE = PARENT_MESSAGE_MEM_USAGE;
let WorkerStates;
exports.WorkerStates = WorkerStates;

(function (WorkerStates) {
  WorkerStates['STARTING'] = 'starting';
  WorkerStates['OK'] = 'ok';
  WorkerStates['OUT_OF_MEMORY'] = 'oom';
  WorkerStates['RESTARTING'] = 'restarting';
  WorkerStates['SHUTTING_DOWN'] = 'shutting-down';
  WorkerStates['SHUT_DOWN'] = 'shut-down';
})(WorkerStates || (exports.WorkerStates = WorkerStates = {}));

let WorkerEvents;
exports.WorkerEvents = WorkerEvents;

(function (WorkerEvents) {
  WorkerEvents['STATE_CHANGE'] = 'state-change';
})(WorkerEvents || (exports.WorkerEvents = WorkerEvents = {}));
