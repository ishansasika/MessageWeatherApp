<script>
	// import Message from './Message.svelte';
  import { onMount } from "svelte";
  import Message from "./Message.svelte";
  // define the data holding variable
  let messages;

	onMount(async () => {
    await fetch(`http://localhost:8081/`)
      .then(r => r.json())
      .then(data => {
        messages = data;
      });
  })

</script>

{#if messages}
  {#each messages as message }
    <ul>
      <li>
        <Message {message} />
      </li>
    </ul>
  {/each}
{:else}
  <p class="loading">loading...</p>
{/if}

<style>
  .loading {
    opacity: 0;
    animation: 0.4s 0.8s forwards fade-in;
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  li {
    list-style-type: georgian;
  }
</style>
	