
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testPing(ip) {
    console.log(`Testing ping to ${ip}...`);
    try {
        const command = `ping -n 1 -w 1000 ${ip}`;
        console.log(`Executing: ${command}`);
        const { stdout, stderr } = await execAsync(command);

        console.log('--- STDOUT ---');
        console.log(stdout);
        console.log('--- END STDOUT ---');

        if (stderr) {
            console.log('--- STDERR ---');
            console.log(stderr);
            console.log('--- END STDERR ---');
        }

        const lowerOutput = stdout.toLowerCase();
        const success = lowerOutput.includes('ttl=') ||
            lowerOutput.includes('respuesta desde') ||
            lowerOutput.includes('reply from');

        console.log(`Result: ${success ? 'SUCCESS' : 'FAILURE'}`);
        console.log(`Matches 'ttl=': ${lowerOutput.includes('ttl=')}`);
        console.log(`Matches 'respuesta desde': ${lowerOutput.includes('respuesta desde')}`);

    } catch (error) {
        console.error('--- ERROR ---');
        console.error(error);
        console.error('--- END ERROR ---');
    }
}

// Test with PC03 IP
testPing('192.168.93.129');
