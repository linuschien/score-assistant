package com.scoreassistant.adapter.in.web.error;

import com.scoreassistant.domain.exception.OptimisticLockingException;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import graphql.GraphQLError;
import graphql.GraphqlErrorBuilder;
import graphql.schema.DataFetchingEnvironment;
import org.springframework.graphql.execution.DataFetcherExceptionResolverAdapter;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.stereotype.Component;

/**
 * Centralized GraphQL error resolver mapping domain exceptions to
 * appropriate GraphQL error types.
 */
@Component
public class GlobalGraphQLExceptionHandler extends DataFetcherExceptionResolverAdapter {

    @Override
    protected GraphQLError resolveToSingleError(Throwable ex, DataFetchingEnvironment env) {
        return switch (ex) {
            case ResourceNotFoundException e -> GraphqlErrorBuilder.newError(env)
                    .errorType(ErrorType.NOT_FOUND)
                    .message(e.getMessage())
                    .build();
            case OptimisticLockingException e -> GraphqlErrorBuilder.newError(env)
                    .errorType(ErrorType.FORBIDDEN)
                    .message(e.getMessage())
                    .build();
            default -> GraphqlErrorBuilder.newError(env)
                    .errorType(ErrorType.INTERNAL_ERROR)
                    .message("Internal error: " + ex.getMessage())
                    .build();
        };
    }
}
