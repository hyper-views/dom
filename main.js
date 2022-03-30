let changes = [];
let changesScheduled = false;
let fragmentSymbol = Symbol("fragment");
let hookMap = new WeakMap();
let paths = [];
let pathPrefixes = [];
let proxySymbol = Symbol("proxy");
let recordPaths = false;
let refSymbol = Symbol("ref");

let addHook = (paths, payload) => {
  for (let i = 0; i < paths.length; i++) {
    let [object, property] = paths[i];

    let map = hookMap.get(object);

    if (!map) {
      map = {};
      hookMap.set(object, map);
    }

    map[property] = map[property] ?? [];
    map[property].push(payload);
  }
};

let buildElement = (element, attributes, svg, children) => {
  if (attributes != null) {
    attributes = Object.entries(attributes);

    for (let i = 0; i < attributes.length; i++) {
      let [key, value] = attributes[i];
      let isRef = value[refSymbol] != null;
      let initial = value;

      if (isRef) {
        initial = value[refSymbol].initial;
      }

      if (key.startsWith("on")) {
        isRef = false;
        element.addEventListener(key.substring(2), ...toArray(initial));
      } else {
        setAttr(element, key, initial);
      }

      if (isRef) {
        addHook(value[refSymbol].paths, {
          type: 1,
          refs: new WeakRef(element),
          key,
          callback: value[refSymbol].callback,
        });
      }
    }
  }

  element.append(
    ...children.flatMap((value) => {
      let isRef = value[refSymbol] != null;

      if (!isRef) return toNodes(svg, value).nodes;

      let { nodes, refs } = toNodes(svg, value[refSymbol].initial, true);

      addHook(value[refSymbol].paths, {
        type: 2,
        refs,
        svg,
        callback: value[refSymbol].callback,
      });

      return nodes;
    })
  );

  return element;
};

let runChanges = () => {
  let itemSet = new Set();

  while (changes.length) {
    let { property, value, receiver } = changes.shift();
    let map = hookMap.get(receiver);

    if (map && map[property] && !itemSet.has(map[property])) {
      let item = map[property];

      itemSet.add(item);

      for (let i = 0; i < item.length; i++) {
        let { type, refs, key, svg, callback } = item[i];

        if (type === 1) {
          let element = refs.deref();

          if (element) {
            setAttr(element, key, callback(value));
          }
        }

        if (type === 2) {
          let { nodes, refs: additions } = toNodes(svg, callback(value), true),
            node;

          item[i].refs = additions;

          for (let i = 0; i < refs.length; i++) {
            let element = refs[i].deref();

            node = nodes.shift();

            if (!element) continue;

            if (node) {
              element.replaceWith(node);
            } else {
              element.remove();
            }
          }

          if (nodes.length) {
            node.after(...nodes);
          }
        }
      }
    }
  }

  changesScheduled = false;
};

let setAttr = (element, key, value) => {
  if (value === true || value === false) {
    element.toggleAttribute(key, value);
  } else {
    element.setAttribute(key, value);
  }
};

let toArray = (value) => {
  if (Array.isArray(value)) return value;

  return [value];
};

let toNode = (svg, node) => {
  if (typeof node !== "object") {
    return document.createTextNode(node);
  }

  let { tag, attributes, children } = node;

  svg = tag === "svg" ? true : svg;

  let element = !svg
    ? document.createElement(tag)
    : document.createElementNS("http://www.w3.org/2000/svg", tag);

  return buildElement(element, attributes, svg, children);
};

let toNodes = (svg, list, andRefs = false) => {
  let result = { nodes: [] };

  if (andRefs) result.refs = [];

  list = toArray(list).flat(Infinity);

  for (let i = 0; i < list.length; i++) {
    let node = toNode(svg, list[i]);

    result.nodes.push(node);

    if (andRefs) result.refs.push(new WeakRef(node));
  }

  return result;
};

export let compute = (callback) => {
  recordPaths = true;

  if (pathPrefixes.length) paths.push(pathPrefixes[0]);

  let initial = callback();

  recordPaths = false;

  return {
    [refSymbol]: {
      initial,
      callback,
      paths: paths.splice(0, paths.length),
    },
  };
};

export let each = (list, callback) => {
  let result = [];

  pathPrefixes.unshift([list, null]);

  for (let i = 0; i < list.length; i++) {
    pathPrefixes[0][1] = i;

    result.push(callback(list[i], i));
  }

  pathPrefixes.shift();

  return result;
};

export { fragmentSymbol as fragment };

export let h = (tag, attributes, ...children) => {
  if (tag === fragmentSymbol) return children;

  if (typeof tag === "function") {
    return tag({ ...attributes, children });
  }

  return { tag, attributes, children };
};

export let proxy = (state) => {
  state[proxySymbol] = true;

  return new Proxy(state, {
    get(object, property, self) {
      let value = Reflect.get(object, property, self);

      if (recordPaths) {
        paths.push([self, property]);
      }

      if (value != null && typeof value === "object" && !value[proxySymbol]) {
        value = proxy(value);

        Reflect.set(object, property, value, self);
      }

      return value;
    },
    set(object, property, value, receiver) {
      changes.push({ property, value, receiver });

      if (!changesScheduled) {
        changesScheduled = true;

        Promise.resolve().then(runChanges);
      }

      return Reflect.set(object, property, value, receiver);
    },
  });
};

export let render = (args, element) => {
  let attributes = null,
    children;

  if (Array.isArray(args)) {
    children = args;
  } else {
    attributes = args.attributes;
    children = args.children;
  }

  return buildElement(
    element,
    attributes,
    element.nodeName === "svg",
    children
  );
};
