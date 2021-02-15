function noop() { }
function add_location(element, file, line, column, char) {
    element.__svelte_meta = {
        loc: { file, line, column, char }
    };
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function null_to_empty(value) {
    return value == null ? '' : value;
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function prevent_default(fn) {
    return function (event) {
        event.preventDefault();
        // @ts-ignore
        return fn.call(this, event);
    };
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_input_value(input, value) {
    input.value = value == null ? '' : value;
}
function set_style(node, key, value, important) {
    node.style.setProperty(key, value, important ? 'important' : '');
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}

const globals = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

function dispatch_dev(type, detail) {
    document.dispatchEvent(custom_event(type, Object.assign({ version: '3.32.3' }, detail)));
}
function append_dev(target, node) {
    dispatch_dev('SvelteDOMInsert', { target, node });
    append(target, node);
}
function insert_dev(target, node, anchor) {
    dispatch_dev('SvelteDOMInsert', { target, node, anchor });
    insert(target, node, anchor);
}
function detach_dev(node) {
    dispatch_dev('SvelteDOMRemove', { node });
    detach(node);
}
function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
    const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
    if (has_prevent_default)
        modifiers.push('preventDefault');
    if (has_stop_propagation)
        modifiers.push('stopPropagation');
    dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
    const dispose = listen(node, event, handler, options);
    return () => {
        dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
        dispose();
    };
}
function attr_dev(node, attribute, value) {
    attr(node, attribute, value);
    if (value == null)
        dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
    else
        dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
}
function set_data_dev(text, data) {
    data = '' + data;
    if (text.wholeText === data)
        return;
    dispatch_dev('SvelteDOMSetData', { node: text, data });
    text.data = data;
}
function validate_each_argument(arg) {
    if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
        let msg = '{#each} only iterates over array-like objects.';
        if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
            msg += ' You can use a spread to convert this iterable into an array.';
        }
        throw new Error(msg);
    }
}
function validate_slots(name, slot, keys) {
    for (const slot_key of Object.keys(slot)) {
        if (!~keys.indexOf(slot_key)) {
            console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
        }
    }
}
/**
 * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
 */
class SvelteComponentDev extends SvelteComponent {
    constructor(options) {
        if (!options || (!options.target && !options.$$inline)) {
            throw new Error("'target' is a required option");
        }
        super();
    }
    $destroy() {
        super.$destroy();
        this.$destroy = () => {
            console.warn('Component was already destroyed'); // eslint-disable-line no-console
        };
    }
    $capture_state() { }
    $inject_state() { }
}

/* src\routes\Weather.svelte generated by Svelte v3.32.3 */

const { console: console_1 } = globals;
const file = "src\\routes\\Weather.svelte";

// (49:1) {#if loading}
function create_if_block_1(ctx) {
	let div;

	const block = {
		c: function create() {
			div = element("div");
			attr_dev(div, "class", "loader svelte-140u22d");
			add_location(div, file, 49, 2, 1407);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1.name,
		type: "if",
		source: "(49:1) {#if loading}",
		ctx
	});

	return block;
}

// (59:1) {#if incomeData!==null}
function create_if_block(ctx) {
	let div1;
	let div0;
	let table;
	let tr0;
	let td0;
	let t0;
	let t1;
	let t2;
	let br0;
	let t3;
	let t4;
	let tr1;
	let td1;
	let br1;
	let t5;
	let t6;
	let t7;
	let t8;
	let td2;
	let span0;
	let t9;
	let t10;
	let t11;
	let tr2;
	let td3;
	let t12;
	let t13;
	let t14;
	let t15;
	let td4;
	let span1;
	let t16;
	let t17;
	let t18;
	let tr3;
	let td5;
	let t19;
	let t20;
	let t21;
	let t22;
	let span2;
	let t23;
	let t24;
	let img;
	let img_src_value;

	const block = {
		c: function create() {
			div1 = element("div");
			div0 = element("div");
			table = element("table");
			tr0 = element("tr");
			td0 = element("td");
			t0 = text("Hello ");
			t1 = text(/*name*/ ctx[1]);
			t2 = text(" !\n\t\t\t\t\t\t\t\t");
			br0 = element("br");
			t3 = text("  Weather Details of Your Area is shown below");
			t4 = space();
			tr1 = element("tr");
			td1 = element("td");
			br1 = element("br");
			t5 = text("Temperature in ");
			t6 = text(/*city*/ ctx[2]);
			t7 = text(" :");
			t8 = space();
			td2 = element("td");
			span0 = element("span");
			t9 = text(/*temp*/ ctx[3]);
			t10 = text("°");
			t11 = space();
			tr2 = element("tr");
			td3 = element("td");
			t12 = text("Humidity in ");
			t13 = text(/*city*/ ctx[2]);
			t14 = text(" :");
			t15 = space();
			td4 = element("td");
			span1 = element("span");
			t16 = text(/*humidity*/ ctx[4]);
			t17 = text("%");
			t18 = space();
			tr3 = element("tr");
			td5 = element("td");
			t19 = text("Weather Like in ");
			t20 = text(/*city*/ ctx[2]);
			t21 = text(" :");
			t22 = space();
			span2 = element("span");
			t23 = text(/*description*/ ctx[5]);
			t24 = space();
			img = element("img");
			add_location(br0, file, 66, 8, 1854);
			add_location(td0, file, 65, 7, 1827);
			add_location(tr0, file, 64, 5, 1815);
			add_location(br1, file, 71, 10, 1939);
			add_location(td1, file, 71, 6, 1935);
			add_location(span0, file, 73, 7, 1990);
			add_location(td2, file, 72, 6, 1978);
			add_location(tr1, file, 70, 5, 1924);
			add_location(td3, file, 79, 6, 2056);
			add_location(span1, file, 81, 7, 2104);
			add_location(td4, file, 80, 6, 2092);
			add_location(tr2, file, 77, 5, 2044);
			add_location(td5, file, 86, 6, 2169);
			add_location(span2, file, 87, 6, 2209);
			add_location(tr3, file, 84, 5, 2157);
			attr_dev(table, "class", "tabledata svelte-140u22d");
			set_style(table, "width", "60%");
			add_location(table, file, 63, 4, 1766);
			attr_dev(div0, "class", "ulwrpper svelte-140u22d");
			add_location(div0, file, 61, 3, 1738);
			if (img.src !== (img_src_value = /*mapurl*/ ctx[6])) attr_dev(img, "src", img_src_value);
			attr_dev(img, "alt", "mapImageView");
			add_location(img, file, 93, 3, 2275);
			attr_dev(div1, "class", "data svelte-140u22d");
			add_location(div1, file, 59, 2, 1715);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div1, anchor);
			append_dev(div1, div0);
			append_dev(div0, table);
			append_dev(table, tr0);
			append_dev(tr0, td0);
			append_dev(td0, t0);
			append_dev(td0, t1);
			append_dev(td0, t2);
			append_dev(td0, br0);
			append_dev(td0, t3);
			append_dev(tr0, t4);
			append_dev(table, tr1);
			append_dev(tr1, td1);
			append_dev(td1, br1);
			append_dev(td1, t5);
			append_dev(td1, t6);
			append_dev(td1, t7);
			append_dev(tr1, t8);
			append_dev(tr1, td2);
			append_dev(td2, span0);
			append_dev(span0, t9);
			append_dev(span0, t10);
			append_dev(table, t11);
			append_dev(table, tr2);
			append_dev(tr2, td3);
			append_dev(td3, t12);
			append_dev(td3, t13);
			append_dev(td3, t14);
			append_dev(tr2, t15);
			append_dev(tr2, td4);
			append_dev(td4, span1);
			append_dev(span1, t16);
			append_dev(span1, t17);
			append_dev(table, t18);
			append_dev(table, tr3);
			append_dev(tr3, td5);
			append_dev(td5, t19);
			append_dev(td5, t20);
			append_dev(td5, t21);
			append_dev(tr3, t22);
			append_dev(tr3, span2);
			append_dev(span2, t23);
			append_dev(div1, t24);
			append_dev(div1, img);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*name*/ 2) set_data_dev(t1, /*name*/ ctx[1]);
			if (dirty & /*city*/ 4) set_data_dev(t6, /*city*/ ctx[2]);
			if (dirty & /*temp*/ 8) set_data_dev(t9, /*temp*/ ctx[3]);
			if (dirty & /*city*/ 4) set_data_dev(t13, /*city*/ ctx[2]);
			if (dirty & /*humidity*/ 16) set_data_dev(t16, /*humidity*/ ctx[4]);
			if (dirty & /*city*/ 4) set_data_dev(t20, /*city*/ ctx[2]);
			if (dirty & /*description*/ 32) set_data_dev(t23, /*description*/ ctx[5]);

			if (dirty & /*mapurl*/ 64 && img.src !== (img_src_value = /*mapurl*/ ctx[6])) {
				attr_dev(img, "src", img_src_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div1);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(59:1) {#if incomeData!==null}",
		ctx
	});

	return block;
}

function create_fragment(ctx) {
	let div;
	let h1;
	let t1;
	let t2;
	let form;
	let input0;
	let t3;
	let br0;
	let t4;
	let input1;
	let t5;
	let br1;
	let button;
	let t7;
	let mounted;
	let dispose;
	let if_block0 = /*loading*/ ctx[0] && create_if_block_1(ctx);
	let if_block1 = /*incomeData*/ ctx[7] !== null && create_if_block(ctx);

	const block = {
		c: function create() {
			div = element("div");
			h1 = element("h1");
			h1.textContent = "Welcome to Svelte Weather App";
			t1 = space();
			if (if_block0) if_block0.c();
			t2 = space();
			form = element("form");
			input0 = element("input");
			t3 = space();
			br0 = element("br");
			t4 = space();
			input1 = element("input");
			t5 = space();
			br1 = element("br");
			button = element("button");
			button.textContent = "Enter Your Data";
			t7 = space();
			if (if_block1) if_block1.c();
			add_location(h1, file, 47, 1, 1351);
			attr_dev(input0, "placeholder", "Enter Your Name");
			add_location(input0, file, 53, 5, 1510);
			add_location(br0, file, 53, 63, 1568);
			attr_dev(input1, "placeholder", "Enter Your City");
			add_location(input1, file, 54, 5, 1578);
			add_location(br1, file, 55, 5, 1641);
			add_location(button, file, 55, 9, 1645);
			attr_dev(form, "class", "forminput svelte-140u22d");
			add_location(form, file, 52, 1, 1439);
			attr_dev(div, "class", "maindiv svelte-140u22d");
			add_location(div, file, 45, 0, 1327);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, h1);
			append_dev(div, t1);
			if (if_block0) if_block0.m(div, null);
			append_dev(div, t2);
			append_dev(div, form);
			append_dev(form, input0);
			set_input_value(input0, /*name*/ ctx[1]);
			append_dev(form, t3);
			append_dev(form, br0);
			append_dev(form, t4);
			append_dev(form, input1);
			set_input_value(input1, /*city*/ ctx[2]);
			append_dev(form, t5);
			append_dev(form, br1);
			append_dev(form, button);
			append_dev(div, t7);
			if (if_block1) if_block1.m(div, null);

			if (!mounted) {
				dispose = [
					listen_dev(input0, "input", /*input0_input_handler*/ ctx[9]),
					listen_dev(input1, "input", /*input1_input_handler*/ ctx[10]),
					listen_dev(form, "submit", prevent_default(/*submitHandler*/ ctx[8]), false, true, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, [dirty]) {
			if (/*loading*/ ctx[0]) {
				if (if_block0) ; else {
					if_block0 = create_if_block_1(ctx);
					if_block0.c();
					if_block0.m(div, t2);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (dirty & /*name*/ 2 && input0.value !== /*name*/ ctx[1]) {
				set_input_value(input0, /*name*/ ctx[1]);
			}

			if (dirty & /*city*/ 4 && input1.value !== /*city*/ ctx[2]) {
				set_input_value(input1, /*city*/ ctx[2]);
			}

			if (/*incomeData*/ ctx[7] !== null) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block(ctx);
					if_block1.c();
					if_block1.m(div, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

const appid_openweather = "ac0fdd38df429674be21355a4850114b";
const appid_heremaps = "lmuiUmhDK2JQwBnORnRB";
const appcode_heremaps = "W3YBbdzlsKOER9SvMF_V1g";

function instance($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("Weather", slots, []);
	var loading = false;
	var name = "";
	var city = "";
	var temp = "";
	var humidity = "";
	var description = "";
	var mapurl = "";
	var zoomlevel = 14.5;
	var incomeData = null;

	const submitHandler = async () => {
		$$invalidate(0, loading = true);
		console.log(city);

		await fetch(`http://api.openweathermap.org/data/2.5/weather?q=${city}&APPID=${appid_openweather}&units=metric`).then(r => r.json()).then(data => {
			console.log("data =========================> ", data);
			$$invalidate(0, loading = false);
			console.log(data);
			$$invalidate(7, incomeData = data);
			$$invalidate(3, temp = incomeData.main.temp);
			$$invalidate(4, humidity = incomeData.main.humidity);
			$$invalidate(5, description = incomeData.weather[0].description);
			console.log("income data ===> ", incomeData);
			console.log(temp + " " + humidity + " " + description);

			$$invalidate(6, mapurl = `https://image.maps.api.here.com/mia/1.6/mapview?app_id=${appid_heremaps}&app_code=${appcode_heremaps}&c=${incomeData.coord.lat},${incomeData.coord.lon}&t=0&z=${zoomlevel}&w=500
&h=500`);
		}).catch(err => {
			console.log(err);
			$$invalidate(0, loading = false);
			window.alert("You have not entered valid data");
			$$invalidate(2, city = "");
			$$invalidate(1, name = "");
		});
	};

	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Weather> was created with unknown prop '${key}'`);
	});

	function input0_input_handler() {
		name = this.value;
		$$invalidate(1, name);
	}

	function input1_input_handler() {
		city = this.value;
		$$invalidate(2, city);
	}

	$$self.$capture_state = () => ({
		appid_openweather,
		appid_heremaps,
		appcode_heremaps,
		loading,
		name,
		city,
		temp,
		humidity,
		description,
		mapurl,
		zoomlevel,
		incomeData,
		submitHandler
	});

	$$self.$inject_state = $$props => {
		if ("loading" in $$props) $$invalidate(0, loading = $$props.loading);
		if ("name" in $$props) $$invalidate(1, name = $$props.name);
		if ("city" in $$props) $$invalidate(2, city = $$props.city);
		if ("temp" in $$props) $$invalidate(3, temp = $$props.temp);
		if ("humidity" in $$props) $$invalidate(4, humidity = $$props.humidity);
		if ("description" in $$props) $$invalidate(5, description = $$props.description);
		if ("mapurl" in $$props) $$invalidate(6, mapurl = $$props.mapurl);
		if ("zoomlevel" in $$props) zoomlevel = $$props.zoomlevel;
		if ("incomeData" in $$props) $$invalidate(7, incomeData = $$props.incomeData);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		loading,
		name,
		city,
		temp,
		humidity,
		description,
		mapurl,
		incomeData,
		submitHandler,
		input0_input_handler,
		input1_input_handler
	];
}

class Weather extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Weather",
			options,
			id: create_fragment.name
		});
	}
}

var Weather$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': Weather
});

/* src\routes\Message.svelte generated by Svelte v3.32.3 */

const file$1 = "src\\routes\\Message.svelte";

function create_fragment$1(ctx) {
	let article;
	let h1;
	let t0_value = /*message*/ ctx[0].name + "";
	let t0;
	let t1;
	let small;
	let t2;
	let b;
	let t3_value = /*message*/ ctx[0].message + "";
	let t3;

	const block = {
		c: function create() {
			article = element("article");
			h1 = element("h1");
			t0 = text(t0_value);
			t1 = space();
			small = element("small");
			t2 = text("Message: ");
			b = element("b");
			t3 = text(t3_value);
			attr_dev(h1, "class", "svelte-2c08t4");
			add_location(h1, file$1, 6, 1, 72);
			add_location(b, file$1, 8, 11, 116);
			add_location(small, file$1, 7, 1, 97);
			attr_dev(article, "class", "svelte-2c08t4");
			add_location(article, file$1, 5, 0, 61);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, article, anchor);
			append_dev(article, h1);
			append_dev(h1, t0);
			append_dev(article, t1);
			append_dev(article, small);
			append_dev(small, t2);
			append_dev(small, b);
			append_dev(b, t3);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*message*/ 1 && t0_value !== (t0_value = /*message*/ ctx[0].name + "")) set_data_dev(t0, t0_value);
			if (dirty & /*message*/ 1 && t3_value !== (t3_value = /*message*/ ctx[0].message + "")) set_data_dev(t3, t3_value);
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(article);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$1.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$1($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("Message", slots, []);
	let { message } = $$props;
	const writable_props = ["message"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Message> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ("message" in $$props) $$invalidate(0, message = $$props.message);
	};

	$$self.$capture_state = () => ({ message });

	$$self.$inject_state = $$props => {
		if ("message" in $$props) $$invalidate(0, message = $$props.message);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [message];
}

class Message extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { message: 0 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Message",
			options,
			id: create_fragment$1.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*message*/ ctx[0] === undefined && !("message" in props)) {
			console.warn("<Message> was created without expected prop 'message'");
		}
	}

	get message() {
		throw new Error("<Message>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set message(value) {
		throw new Error("<Message>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* src\routes\Messages.svelte generated by Svelte v3.32.3 */
const file$2 = "src\\routes\\Messages.svelte";

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[1] = list[i];
	return child_ctx;
}

// (26:0) {:else}
function create_else_block(ctx) {
	let p;

	const block = {
		c: function create() {
			p = element("p");
			p.textContent = "loading...";
			attr_dev(p, "class", "loading svelte-mopt7y");
			add_location(p, file$2, 26, 2, 490);
		},
		m: function mount(target, anchor) {
			insert_dev(target, p, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(p);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_else_block.name,
		type: "else",
		source: "(26:0) {:else}",
		ctx
	});

	return block;
}

// (18:0) {#if messages}
function create_if_block$1(ctx) {
	let each_1_anchor;
	let current;
	let each_value = /*messages*/ ctx[0];
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	const block = {
		c: function create() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m: function mount(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert_dev(target, each_1_anchor, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			if (dirty & /*messages*/ 1) {
				each_value = /*messages*/ ctx[0];
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i: function intro(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o: function outro(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d: function destroy(detaching) {
			destroy_each(each_blocks, detaching);
			if (detaching) detach_dev(each_1_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$1.name,
		type: "if",
		source: "(18:0) {#if messages}",
		ctx
	});

	return block;
}

// (19:2) {#each messages as message }
function create_each_block(ctx) {
	let ul;
	let li;
	let message;
	let t;
	let current;

	message = new Message({
			props: { message: /*message*/ ctx[1] },
			$$inline: true
		});

	const block = {
		c: function create() {
			ul = element("ul");
			li = element("li");
			create_component(message.$$.fragment);
			t = space();
			attr_dev(li, "class", "svelte-mopt7y");
			add_location(li, file$2, 20, 6, 413);
			add_location(ul, file$2, 19, 4, 402);
		},
		m: function mount(target, anchor) {
			insert_dev(target, ul, anchor);
			append_dev(ul, li);
			mount_component(message, li, null);
			append_dev(ul, t);
			current = true;
		},
		p: function update(ctx, dirty) {
			const message_changes = {};
			if (dirty & /*messages*/ 1) message_changes.message = /*message*/ ctx[1];
			message.$set(message_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(message.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(message.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(ul);
			destroy_component(message);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block.name,
		type: "each",
		source: "(19:2) {#each messages as message }",
		ctx
	});

	return block;
}

function create_fragment$2(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block$1, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*messages*/ ctx[0]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	const block = {
		c: function create() {
			if_block.c();
			if_block_anchor = empty();
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert_dev(target, if_block_anchor, anchor);
			current = true;
		},
		p: function update(ctx, [dirty]) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o: function outro(local) {
			transition_out(if_block);
			current = false;
		},
		d: function destroy(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach_dev(if_block_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$2.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$2($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("Messages", slots, []);
	let messages;

	onMount(async () => {
		await fetch(`http://localhost:8081/`).then(r => r.json()).then(data => {
			$$invalidate(0, messages = data);
		});
	});

	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Messages> was created with unknown prop '${key}'`);
	});

	$$self.$capture_state = () => ({ onMount, Message, messages });

	$$self.$inject_state = $$props => {
		if ("messages" in $$props) $$invalidate(0, messages = $$props.messages);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [messages];
}

class Messages extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Messages",
			options,
			id: create_fragment$2.name
		});
	}
}

var Messages$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': Messages
});

function convert (str, loose) {
	if (str instanceof RegExp) return { keys:false, pattern:str };
	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
	arr[0] || arr.shift();

	while (tmp = arr.shift()) {
		c = tmp[0];
		if (c === '*') {
			keys.push('wild');
			pattern += '/(.*)';
		} else if (c === ':') {
			o = tmp.indexOf('?', 1);
			ext = tmp.indexOf('.', 1);
			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
		} else {
			pattern += '/' + tmp;
		}
	}

	return {
		keys: keys,
		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
	};
}

function Navaid(base, on404) {
	var rgx, curr, routes=[], $={};

	var fmt = $.format = function (uri) {
		if (!uri) return uri;
		uri = '/' + uri.replace(/^\/|\/$/g, '');
		return rgx.test(uri) && uri.replace(rgx, '/');
	};

	base = '/' + (base || '').replace(/^\/|\/$/g, '');
	rgx = base == '/' ? /^\/+/ : new RegExp('^\\' + base + '(?=\\/|$)\\/?', 'i');

	$.route = function (uri, replace) {
		if (uri[0] == '/' && !rgx.test(uri)) uri = base + uri;
		history[(uri === curr || replace ? 'replace' : 'push') + 'State'](uri, null, uri);
	};

	$.on = function (pat, fn) {
		(pat = convert(pat)).fn = fn;
		routes.push(pat);
		return $;
	};

	$.run = function (uri) {
		var i=0, params={}, arr, obj;
		if (uri = fmt(uri || location.pathname)) {
			uri = uri.match(/[^\?#]*/)[0];
			for (curr = uri; i < routes.length; i++) {
				if (arr = (obj=routes[i]).pattern.exec(uri)) {
					for (i=0; i < obj.keys.length;) {
						params[obj.keys[i]] = arr[++i] || null;
					}
					obj.fn(params); // todo loop?
					return $;
				}
			}
			if (on404) on404(uri);
		}
		return $;
	};

	$.listen = function (u) {
		wrap('push');
		wrap('replace');

		function run(e) {
			$.run();
		}

		function click(e) {
			var x = e.target.closest('a'), y = x && x.getAttribute('href');
			if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button || e.defaultPrevented) return;
			if (!y || x.target || x.host !== location.host || y[0] == '#') return;
			if (y[0] != '/' || rgx.test(y)) {
				e.preventDefault();
				$.route(y);
			}
		}

		addEventListener('popstate', run);
		addEventListener('replacestate', run);
		addEventListener('pushstate', run);
		addEventListener('click', click);

		$.unlisten = function () {
			removeEventListener('popstate', run);
			removeEventListener('replacestate', run);
			removeEventListener('pushstate', run);
			removeEventListener('click', click);
		};

		return $.run(u);
	};

	return $;
}

function wrap(type, fn) {
	if (history[type]) return;
	history[type] = type;
	fn = history[type += 'State'];
	history[type] = function (uri) {
		var ev = new Event(type.toLowerCase());
		ev.uri = uri;
		fn.apply(this, arguments);
		return dispatchEvent(ev);
	};
}

/* src\components\Nav.svelte generated by Svelte v3.32.3 */

const file$3 = "src\\components\\Nav.svelte";

function create_fragment$3(ctx) {
	let nav;
	let ul;
	let li0;
	let a0;
	let t0;
	let a0_class_value;
	let t1;
	let li1;
	let a1;
	let t2;
	let a1_class_value;
	let t3;
	let li2;
	let a2;
	let t4;
	let a2_class_value;
	let t5;
	let li3;
	let a3;
	let t6;
	let a3_class_value;

	const block = {
		c: function create() {
			nav = element("nav");
			ul = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("HOME");
			t1 = space();
			li1 = element("li");
			a1 = element("a");
			t2 = text("ABOUT");
			t3 = space();
			li2 = element("li");
			a2 = element("a");
			t4 = text("MESSAGES");
			t5 = space();
			li3 = element("li");
			a3 = element("a");
			t6 = text("WEATHER");
			attr_dev(a0, "class", a0_class_value = "" + (null_to_empty(/*isActive*/ ctx[0]("HOME")) + " svelte-1hq25gf"));
			attr_dev(a0, "href", "/");
			add_location(a0, file$3, 2, 6, 18);
			attr_dev(li0, "class", "svelte-1hq25gf");
			add_location(li0, file$3, 2, 2, 14);
			attr_dev(a1, "class", a1_class_value = "" + (null_to_empty(/*isActive*/ ctx[0]("ABOUT")) + " svelte-1hq25gf"));
			attr_dev(a1, "href", "/about");
			add_location(a1, file$3, 3, 6, 79);
			attr_dev(li1, "class", "svelte-1hq25gf");
			add_location(li1, file$3, 3, 2, 75);
			attr_dev(a2, "class", a2_class_value = "" + (null_to_empty(/*isActive*/ ctx[0]("MESSAGES")) + " svelte-1hq25gf"));
			attr_dev(a2, "href", "/messages");
			add_location(a2, file$3, 4, 6, 147);
			attr_dev(li2, "class", "svelte-1hq25gf");
			add_location(li2, file$3, 4, 2, 143);
			attr_dev(a3, "class", a3_class_value = "" + (null_to_empty(/*isActive*/ ctx[0]("WEATHER")) + " svelte-1hq25gf"));
			attr_dev(a3, "href", "/weather");
			add_location(a3, file$3, 5, 6, 224);
			attr_dev(li3, "class", "svelte-1hq25gf");
			add_location(li3, file$3, 5, 2, 220);
			attr_dev(ul, "class", "svelte-1hq25gf");
			add_location(ul, file$3, 1, 1, 7);
			attr_dev(nav, "class", "svelte-1hq25gf");
			add_location(nav, file$3, 0, 0, 0);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, nav, anchor);
			append_dev(nav, ul);
			append_dev(ul, li0);
			append_dev(li0, a0);
			append_dev(a0, t0);
			append_dev(ul, t1);
			append_dev(ul, li1);
			append_dev(li1, a1);
			append_dev(a1, t2);
			append_dev(ul, t3);
			append_dev(ul, li2);
			append_dev(li2, a2);
			append_dev(a2, t4);
			append_dev(ul, t5);
			append_dev(ul, li3);
			append_dev(li3, a3);
			append_dev(a3, t6);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*isActive*/ 1 && a0_class_value !== (a0_class_value = "" + (null_to_empty(/*isActive*/ ctx[0]("HOME")) + " svelte-1hq25gf"))) {
				attr_dev(a0, "class", a0_class_value);
			}

			if (dirty & /*isActive*/ 1 && a1_class_value !== (a1_class_value = "" + (null_to_empty(/*isActive*/ ctx[0]("ABOUT")) + " svelte-1hq25gf"))) {
				attr_dev(a1, "class", a1_class_value);
			}

			if (dirty & /*isActive*/ 1 && a2_class_value !== (a2_class_value = "" + (null_to_empty(/*isActive*/ ctx[0]("MESSAGES")) + " svelte-1hq25gf"))) {
				attr_dev(a2, "class", a2_class_value);
			}

			if (dirty & /*isActive*/ 1 && a3_class_value !== (a3_class_value = "" + (null_to_empty(/*isActive*/ ctx[0]("WEATHER")) + " svelte-1hq25gf"))) {
				attr_dev(a3, "class", a3_class_value);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(nav);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$3.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$3($$self, $$props, $$invalidate) {
	let isActive;
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("Nav", slots, []);
	let { active } = $$props;
	const writable_props = ["active"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Nav> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ("active" in $$props) $$invalidate(1, active = $$props.active);
	};

	$$self.$capture_state = () => ({ active, isActive });

	$$self.$inject_state = $$props => {
		if ("active" in $$props) $$invalidate(1, active = $$props.active);
		if ("isActive" in $$props) $$invalidate(0, isActive = $$props.isActive);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*active*/ 2) {
			$$invalidate(0, isActive = str => active === str ? "selected" : "");
		}
	};

	return [isActive, active];
}

class Nav extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$3, create_fragment$3, safe_not_equal, { active: 1 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Nav",
			options,
			id: create_fragment$3.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*active*/ ctx[1] === undefined && !("active" in props)) {
			console.warn("<Nav> was created without expected prop 'active'");
		}
	}

	get active() {
		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set active(value) {
		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* src\components\App.svelte generated by Svelte v3.32.3 */
const file$4 = "src\\components\\App.svelte";

function create_fragment$4(ctx) {
	let nav;
	let t;
	let main;
	let switch_instance;
	let current;

	nav = new Nav({
			props: { active: /*active*/ ctx[2] },
			$$inline: true
		});

	var switch_value = /*Route*/ ctx[0];

	function switch_props(ctx) {
		return {
			props: { params: /*params*/ ctx[1] },
			$$inline: true
		};
	}

	if (switch_value) {
		switch_instance = new switch_value(switch_props(ctx));
	}

	const block = {
		c: function create() {
			create_component(nav.$$.fragment);
			t = space();
			main = element("main");
			if (switch_instance) create_component(switch_instance.$$.fragment);
			attr_dev(main, "class", "svelte-1uhnsl8");
			add_location(main, file$4, 2, 0, 18);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			mount_component(nav, target, anchor);
			insert_dev(target, t, anchor);
			insert_dev(target, main, anchor);

			if (switch_instance) {
				mount_component(switch_instance, main, null);
			}

			current = true;
		},
		p: function update(ctx, [dirty]) {
			const nav_changes = {};
			if (dirty & /*active*/ 4) nav_changes.active = /*active*/ ctx[2];
			nav.$set(nav_changes);
			const switch_instance_changes = {};
			if (dirty & /*params*/ 2) switch_instance_changes.params = /*params*/ ctx[1];

			if (switch_value !== (switch_value = /*Route*/ ctx[0])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = new switch_value(switch_props(ctx));
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, main, null);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(nav.$$.fragment, local);
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(nav.$$.fragment, local);
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(nav, detaching);
			if (detaching) detach_dev(t);
			if (detaching) detach_dev(main);
			if (switch_instance) destroy_component(switch_instance);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$4.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$4($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("App", slots, []);
	let Route, params = {}, active;
	let uri = location.pathname;

	function run(thunk, obj) {
		const target = uri;

		thunk.then(m => {
			if (target !== uri) return;
			$$invalidate(1, params = obj || {});

			if (m.preload) {
				m.preload({ params }).then(() => {
					if (target !== uri) return;
					$$invalidate(0, Route = m.default);
					window.scrollTo(0, 0);
				});
			} else {
				$$invalidate(0, Route = m.default);
				window.scrollTo(0, 0);
			}
		});
	}

	const router = Navaid("/").on("/", () => run(import('./Home-b02df529.js'))).on("/about", () => run(import('./About-6428b307.js'))).on("/messages", () => run(Promise.resolve().then(function () { return Messages$1; }))).on("/weather", () => run(Promise.resolve().then(function () { return Weather$1; }))).listen();
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
	});

	$$self.$capture_state = () => ({
		Weather,
		Message,
		Messages,
		Navaid,
		onDestroy,
		Nav,
		Route,
		params,
		active,
		uri,
		run,
		router
	});

	$$self.$inject_state = $$props => {
		if ("Route" in $$props) $$invalidate(0, Route = $$props.Route);
		if ("params" in $$props) $$invalidate(1, params = $$props.params);
		if ("active" in $$props) $$invalidate(2, active = $$props.active);
		if ("uri" in $$props) $$invalidate(3, uri = $$props.uri);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$invalidate(2, active = uri.split("/")[1] || "home");
	return [Route, params, active];
}

class App extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "App",
			options,
			id: create_fragment$4.name
		});
	}
}

// import '@rollup/plugin-json';

new App({
	target: document.body
});

export { SvelteComponentDev as S, space as a, attr_dev as b, add_location as c, dispatch_dev as d, element as e, insert_dev as f, append_dev as g, detach_dev as h, init as i, noop as n, safe_not_equal as s, validate_slots as v };
//# sourceMappingURL=index.js.map
