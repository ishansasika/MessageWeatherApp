<svelte:head>
	<title>About</title>
</svelte:head>

<h1>first svelte app</h1>
<figure>
	<img alt="Borat" src="/widya.png">
	<figcaption>Powered by Widya</figcaption>
</figure>

<p>This is ABOUT Page</p>

<style>

	h1, figure, p {
		text-align: center;
		margin: 0 auto;

	}
	h1 {
		text-shadow: 0cm;
		text-decoration: blue;
		font-size: 2em;
		text-transform: uppercase;
		font-weight: 700;
		margin: 0 0 0.5em 0;
		padding-right: 0px;
	}
	figure {
		padding-top: 100px;
		margin: 0ch auto;
		size: 1in;
	}
	figcaption{
		padding-left: 500px;
		text-transform: uppercase;
	}
	img {
		width: 100%;
		max-width: 400px;
		margin: 0 0 1em 0;
	}
	p{
		font-size: 2em;
		text-align: left;
		/* padding-right: 500px; */
		padding-top: 100px;
	}
</style>
