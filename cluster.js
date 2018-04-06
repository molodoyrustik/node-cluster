const cluster = require('cluster');
const os = require('os');

if(cluster.isMaster) {
	const cpus = os.cpus().length;
	console.log(`Clustering to ${cpus} CPUs`);

	for (let i = 0; i<cpus; i++) { // [1]
		cluster.fork();
	}

	cluster.on('exit', (worker, code) => {
		if(code != 0 && !worker.suicide) {
			console.log('Worker crashed. Starting a new worker');
			cluster.fork();
		}
	});

	process.on('SIGUSR2', () => {//[1]
		const workers = Object.keys(cluster.workers);
		function restartWorker(i) { //[2]
			if (i >= workers.length) return;
			const worker = cluster.workers[workers[i]];
			console.log(`Stopping worker: ${worker.process.pid}`);
			worker.disconnect(); //[3]
			worker.on('exit', () => {
				if (!worker.suicide) return;
				const newWorker = cluster.fork(); //[4]
				newWorker.on('listening', () => {
					restartWorker(i + 1); //[5]
				});
			});
		}
		restartWorker(0);	
	})
} else {
	require('./index'); // [2]
}