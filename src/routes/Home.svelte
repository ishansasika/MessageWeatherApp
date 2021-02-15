<svelte:head>
	<title>Svelte Demo Template</title>
</svelte:head>

<h1>You're Welcome!</h1>

<figure>
	<img alt="Govinena" src="/1.png">
	<figcaption>Hello!</figcaption>
</figure>

<p><strong>Welcome to Govi-Nena Svelte App</strong></p>

<style>
	:global(body) {
		background-color: #f2eee2;
		color: #0084f6;
	}
	/* :global(body.dark-mode) {
		background-color: #1d3040;
		color: #bfc2c7;
	} */
	h1, figure, p {
		text-align: center;
		margin: 0 auto;
	}
	h1 {
		font-size: 2.8em;
		text-transform: uppercase;
		font-weight: 700;
		margin: 0 0 0.5em 0;
	}
	figure {
		margin: 0 0 1em 0;
	}
	img {
		width: 100%;
		max-width: 400px;
		margin: 0 0 1em 0;
	}
	p {
		margin: 1em auto;
	}
	@media (min-width: 480px) {
		h1 {
			font-size: 4em;
		}
	}
</style>
