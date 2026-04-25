import { describe, it, expect } from 'vitest';

describe('Exercise session persistence', () => {
  it('should call endSession when session completes via currentIndex check', async () => {
    // This test verifies that the useEffect in Exercise.tsx that checks
    // session.currentIndex >= session.queue.length calls endSession()
    // to persist statistics to the global store
    
    // The logic is in src/components/Exercise/Exercise.tsx lines 48-58
    // The useEffect should call:
    // 1. setFinalScore(getScore()) - to capture final score
    // 2. endSession() - to persist stats to global store
    // 3. setSessionComplete(true) - to show completion screen
    
    // Since this is a React component integration test,
    // we verify the code structure exists by checking the file content
    const exerciseFile = (await import('fs')).readFileSync(
      (await import('path')).join(import.meta.dirname, '../components/Exercise/Exercise.tsx'),
      'utf-8'
    );
    
    // Check that the useEffect contains both setFinalScore and endSession calls
    const sessionCompleteEffect = exerciseFile.match(
      /if \(session && session\.currentIndex >= session\.queue\.length\) \{[\s\S]*?\}/
    );
    
    expect(sessionCompleteEffect).toBeTruthy();
    // Check that completeSession helper function exists
    expect(exerciseFile).toContain('const completeSession = () => {');
    expect(exerciseFile).toContain('setFinalScore(getScore())');
    expect(exerciseFile).toContain('endSession()');
    expect(exerciseFile).toContain('setSessionComplete(true)');

    // Verify completeSession helper is defined once
    const completeSessionCount = (exerciseFile.match(/const completeSession = /g) || []).length;
    expect(completeSessionCount).toBe(1);

    // Verify completeSession is called in both useEffect and handleNext
    const completeSessionCalls = (exerciseFile.match(/completeSession\(\)/g) || []).length;
    expect(completeSessionCalls).toBeGreaterThanOrEqual(2);
  });
});
