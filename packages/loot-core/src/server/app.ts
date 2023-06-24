import mitt from 'mitt';

import { captureException } from '../platform/exceptions';

// This is a simple helper abstraction for defining methods exposed to
// the client. It doesn't do much, but checks for naming conflicts and
// makes it cleaner to combine methods. We call a group of related
// methods an "app".

class App<Handlers> {
  events;
  handlers: Handlers;
  services;
  unlistenServices;

  constructor() {
    this.handlers = {} as Handlers;
    this.services = [];
    this.events = mitt();
    this.unlistenServices = [];
  }

  method<Name extends string & keyof Handlers>(
    name: Name,
    func: Handlers[Name],
  ) {
    if (this.handlers[name] != null) {
      throw new Error(
        'Conflicting method name, names must be globally unique: ' + name,
      );
    }
    this.handlers[name] = func;
  }

  service(func) {
    this.services.push(func);
  }

  combine(...apps) {
    for (let app of apps) {
      Object.keys(app.handlers).forEach(name => {
        this.method(name as string & keyof Handlers, app.handlers[name]);
      });

      app.services.forEach(service => {
        this.service(service);
      });

      for (let [name, listeners] of app.events.all.entries()) {
        for (let listener of listeners) {
          this.events.on(name, listener);
        }
      }
    }
  }

  startServices() {
    if (this.unlistenServices.length > 0) {
      captureException(
        new Error(
          'App: startServices called while services are already running',
        ),
      );
    }
    this.unlistenServices = this.services.map(service => service());
  }

  stopServices() {
    this.unlistenServices.forEach(unlisten => {
      if (unlisten) {
        unlisten();
      }
    });
    this.unlistenServices = [];
  }
}

export function createApp<T>() {
  return new App<T>();
}
