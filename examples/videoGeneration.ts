import { LLMCaller } from '../src/index.ts';
import dotenv from 'dotenv';
import path from 'path';
import { getDirname } from '../src/utils/paths.ts';

const __dirname = getDirname(import.meta.url);

dotenv.config();

async function run() {
    const caller = new LLMCaller('openai', 'sora-2-pro');


    // Blocking example: create, poll, and auto-download to output/video.mp4
    const outputPath = path.join(__dirname, 'output', 'video.mp4');

    const resBlocking = await caller.call({
        text: `A 3D animated hybrid creature with the head and upper body of a panda, octopus-like legs with blue suction cups, and translucent dragonfly wings. The creature hovers in the air. VERY IMPORTANT: its dragonfly-like wings beating rapidly with a soft shimmer, creating a subtle vibration effect. The tentacles move actively — curling, uncurling, and adjusting balance as if it’s keeping itself stable in the air. The creature slightly bobs and rotates while maintaining eye contact with the camera, occasionally blinking. The camera smoothly tracks around it with light reflections playing over the glossy tentacles and iridescent wings. The motion is lively and continuous — no still moments or fade-ins, just constant dynamic animation.`,
        file: path.join(__dirname, 'character.png'),
        output: { video: { size: '1280x720', seconds: 4, wait: 'poll' } },
        outputPath
    });
    console.log('Blocking video call metadata:', resBlocking[0].metadata);

    if (resBlocking[0].metadata?.videoStatus === 'failed') {
        console.error('Video generation failed!');
        console.error('Error:', resBlocking[0].metadata?.videoError);
    } else if (resBlocking[0].metadata?.videoStatus === 'completed') {
        console.log('Video completed successfully!');
        console.log('Saved to:', resBlocking[0].metadata?.videoSavedPath);
    }

    console.log('Usage:', resBlocking[0].metadata?.usage);

    // // Non-blocking example: create only, then retrieve and download manually
    // const resNonBlocking = await caller.call({
    //     text: 'A cool cat on a motorcycle in the night',
    //     output: { video: { size: '1280x720', seconds: 8, wait: 'none' } }
    // });

    // const jobId = resNonBlocking[0].metadata?.videoJobId;
    // if (!jobId) {
    //     console.error('No videoJobId returned');
    //     return;
    // }

    // console.log('Non-blocking job usage (estimated):', resNonBlocking[0].metadata?.usage);

    // // Poll until completion
    // let status = await caller.retrieveVideo(jobId);
    // process.stdout.write('Processing');
    // while (status.status === 'queued' || status.status === 'in_progress') {
    //     await new Promise(r => setTimeout(r, 2000));
    //     status = await caller.retrieveVideo(jobId);
    //     process.stdout.write('.');
    // }
    // process.stdout.write('\n');

    // if (status.status !== 'completed') {
    //     console.error('Video failed with status:', status.status);
    //     return;
    // }

    // // Download the final MP4
    // const out2 = path.join(__dirname, 'output', 'video2.mp4');
    // await caller.downloadVideo(jobId, { variant: 'video', outputPath: out2 });
    // console.log('Downloaded to:', out2);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
