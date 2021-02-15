<Nav {active} />

<main>
	<svelte:component this={Route} {params} />
</main>

<script>
	import Weather from './../routes/Weather.svelte';
	import Message from './../routes/Message.svelte';
	import Messages from './../routes/Messages.svelte';
	import Navaid from 'navaid';
	import { onDestroy } from 'svelte';
	import Nav from './Nav.svelte';

	let Route, params={}, active;
	let uri = location.pathname;
	$: active = uri.split('/')[1] || 'home';

	function run(thunk, obj) {
		const target = uri;

		thunk.then(m => {
			if (target !== uri) return;

			params = obj || {};

			if (m.preload) {
				m.preload({ params }).then(() => {
					if (target !== uri) return;
					Route = m.default;
					window.scrollTo(0, 0);
				});
			} else {
				Route = m.default;
				window.scrollTo(0, 0);
			}
		});
	}

	const router = Navaid('/')

		.on('/', () => run(import('../routes/Home.svelte')))
		.on('/about', () => run(import('../routes/About.svelte')))
		.on('/messages', () => run(import('../routes/Messages.svelte')))
		.on('/weather', () => run(import('../routes/Weather.svelte')))

		.listen();

</script>

<style>
	main {
		position: relative;
		max-width: 56em;
		background-color: white;
		padding: 2em;
		margin: 0 auto;
		box-sizing: border-box;
	}
</style>


