<nav>
	<ul>
		<li><a class="{ isActive('HOME') }" href="/">HOME</a></li>
		<li><a class="{ isActive('ABOUT') }" href="/about">ABOUT</a></li>
		<li><a class="{ isActive('MESSAGES') }" href="/messages">MESSAGES</a></li>
		<li><a class="{ isActive('WEATHER') }" href="/weather">WEATHER</a></li>
	</ul>
</nav>

<script>
	export let active;
	$: isActive = str => active === str ? 'selected' : '';
</script>

<style>
	nav {
		border-bottom: 1px solid rgba(170,30,30,0.1);
		font-weight: 300;
		padding: 0 1em;
	}
	ul {
		margin: 0;
		padding: 0;
	}
	/* clearfix */
	ul::after {
		content: '';
		display: block;
		clear: both;
	}
	li {
		display: block;
		float: left;
	}
	.selected {
		position: relative;
		display: inline-block;
	}
	.selected::after {
		position: absolute;
		content: '';
		width: calc(100% - 1em);
		height: 2px;
		background-color: rgb(170,30,30);
		display: block;
		bottom: -1px;
	}
	a {
		text-decoration: none;
		padding: 1em 0.5em;
		display: block;
	}
</style>
