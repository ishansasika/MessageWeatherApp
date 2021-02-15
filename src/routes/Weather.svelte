<script>
	const appid_openweather = "ac0fdd38df429674be21355a4850114b";
	const appid_heremaps = "lmuiUmhDK2JQwBnORnRB";
	const appcode_heremaps = "W3YBbdzlsKOER9SvMF_V1g";
	var loading = false;
	var name = "";
	var city = "";
	var temp = "";
	var humidity = "";
	var description = "";
	var mapurl = "";
	var zoomlevel = 14.5;
	var incomeData =null;

	const submitHandler = async() => {
		loading = true;
		console.log(city);
		await fetch(
				`http://api.openweathermap.org/data/2.5/weather?q=${city}&APPID=${appid_openweather}&units=metric`
			)
			.then(r => r.json())
			.then(data => {
				console.log('data =========================> ', data);
				loading = false;
				console.log(data);
				incomeData = data;
				temp = incomeData.main.temp;
				humidity = incomeData.main.humidity;
				description = incomeData.weather[0].description;
				console.log("income data ===> ", incomeData)
				console.log(temp + " " + humidity + " " + description);
				mapurl = `https://image.maps.api.here.com/mia/1.6/mapview?app_id=${appid_heremaps}&app_code=${appcode_heremaps}&c=${incomeData.coord.lat},${incomeData.coord.lon}&t=0&z=${zoomlevel}&w=500
&h=500`;
			})
			.catch(err => {
				console.log(err);
				loading = false;
				window.alert("You have not entered valid data");
				city = "";
				name = "";
			});

	};
</script>

<div class="maindiv">

	<h1>Welcome to Svelte Weather App</h1>
	{#if loading}
		<div class="loader" />
	{/if}

	<form class="forminput" on:submit|preventDefault={submitHandler}>
					<input bind:value={name} placeholder="Enter Your Name" /> <br>
					<input bind:value={city} placeholder="Enter Your City" />
					<br><button>Enter Your Data</button>
	</form>

	{#if incomeData!==null}
		<div class="data">

			<div class="ulwrpper">

				<table class="tabledata" style="width:60%">
					<tr>
							<td>Hello {name} !
								<br>  Weather Details of Your Area is shown below
							</td>


					<tr>
						<td><br>Temperature in {city} :</td>
						<td>
							<span>{temp}&deg;</span>
						</td>

					</tr>
					<tr>

						<td>Humidity in {city} :</td>
						<td>
							<span>{humidity}%</span>
						</td>
					</tr>
					<tr>

						<td>Weather Like in {city} :</td>
						<span>{description}</span>
					</tr>
				</table>

			</div>

			<img src={mapurl} alt="mapImageView" />
		</div>
	{/if}

</div>

<style>

	.data {
		text-align: center;
	}
	.maindiv {
		text-align: center;
		margin-top: 5%;
	}
	.tabledata {
		margin-left: 0%;
		padding-top: 10px;
	}
	.ulwrpper {
		width: 50%;
		text-align: left;
		margin-left: 38%;
	}
	.forminput {
		margin-top: 3%;
	}
	/* loader style */
	.loader {
		margin-left: 45%;
		border: 16px solid #f3f3f3;
		border-top: 16px solid #3498db;
		border-radius: 50%;
		width: 120px;
		height: 120px;
		animation: spin 2s linear infinite;
	}
	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
