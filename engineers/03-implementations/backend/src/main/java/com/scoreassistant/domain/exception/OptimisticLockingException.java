package com.scoreassistant.domain.exception;

public class OptimisticLockingException extends RuntimeException {
    private final int currentVersion;

    public OptimisticLockingException(int currentVersion) {
        super("Optimistic locking conflict: version mismatch");
        this.currentVersion = currentVersion;
    }

    public int getCurrentVersion() {
        return currentVersion;
    }
}
