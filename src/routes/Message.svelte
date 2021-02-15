<script>
  // create a prop
  export let message;
</script>

<article>
	<h1>{message.name}</h1>
	<small>
		Message: <b>{message.message}</b>
	</small>
</article>

<style>
  article {
		font-size: 2em;
    margin: 0 0 1em 0;
  }
  h1 {
    font-size: 1.4em;
    margin: 0;
    display: block;
  }
</style>
