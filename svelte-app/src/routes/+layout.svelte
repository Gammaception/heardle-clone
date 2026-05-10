<script>
	import favicon from '$lib/assets/favicon.svg';
	export const prerender = true;
	export const trailingSlash = 'always';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
