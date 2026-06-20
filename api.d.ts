import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { ApiError, DeleteResult, HealthStatus, ImageGenInput, ImageGenResult, Project, ProjectInput, ProjectUpdate, SpeechGenInput, SpeechGenResult, VideoCompileInput, VideoCompileResult } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGenerateImageUrl: () => string;
/**
 * @summary Generate cartoon image from prompt via Hugging Face
 */
export declare const generateImage: (imageGenInput: ImageGenInput, options?: RequestInit) => Promise<ImageGenResult>;
export declare const getGenerateImageMutationOptions: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateImage>>, TError, {
        data: BodyType<ImageGenInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateImage>>, TError, {
    data: BodyType<ImageGenInput>;
}, TContext>;
export type GenerateImageMutationResult = NonNullable<Awaited<ReturnType<typeof generateImage>>>;
export type GenerateImageMutationBody = BodyType<ImageGenInput>;
export type GenerateImageMutationError = ErrorType<ApiError>;
/**
* @summary Generate cartoon image from prompt via Hugging Face
*/
export declare const useGenerateImage: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateImage>>, TError, {
        data: BodyType<ImageGenInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateImage>>, TError, {
    data: BodyType<ImageGenInput>;
}, TContext>;
export declare const getGenerateSpeechUrl: () => string;
/**
 * @summary Generate Hindi speech audio from text
 */
export declare const generateSpeech: (speechGenInput: SpeechGenInput, options?: RequestInit) => Promise<SpeechGenResult>;
export declare const getGenerateSpeechMutationOptions: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateSpeech>>, TError, {
        data: BodyType<SpeechGenInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateSpeech>>, TError, {
    data: BodyType<SpeechGenInput>;
}, TContext>;
export type GenerateSpeechMutationResult = NonNullable<Awaited<ReturnType<typeof generateSpeech>>>;
export type GenerateSpeechMutationBody = BodyType<SpeechGenInput>;
export type GenerateSpeechMutationError = ErrorType<ApiError>;
/**
* @summary Generate Hindi speech audio from text
*/
export declare const useGenerateSpeech: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateSpeech>>, TError, {
        data: BodyType<SpeechGenInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateSpeech>>, TError, {
    data: BodyType<SpeechGenInput>;
}, TContext>;
export declare const getCompileVideoUrl: () => string;
/**
 * @summary Compile scenes into an MP4 video using FFmpeg
 */
export declare const compileVideo: (videoCompileInput: VideoCompileInput, options?: RequestInit) => Promise<VideoCompileResult>;
export declare const getCompileVideoMutationOptions: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof compileVideo>>, TError, {
        data: BodyType<VideoCompileInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof compileVideo>>, TError, {
    data: BodyType<VideoCompileInput>;
}, TContext>;
export type CompileVideoMutationResult = NonNullable<Awaited<ReturnType<typeof compileVideo>>>;
export type CompileVideoMutationBody = BodyType<VideoCompileInput>;
export type CompileVideoMutationError = ErrorType<ApiError>;
/**
* @summary Compile scenes into an MP4 video using FFmpeg
*/
export declare const useCompileVideo: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof compileVideo>>, TError, {
        data: BodyType<VideoCompileInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof compileVideo>>, TError, {
    data: BodyType<VideoCompileInput>;
}, TContext>;
export declare const getListProjectsUrl: () => string;
/**
 * @summary List all projects
 */
export declare const listProjects: (options?: RequestInit) => Promise<Project[]>;
export declare const getListProjectsQueryKey: () => readonly ["/api/projects"];
export declare const getListProjectsQueryOptions: <TData = Awaited<ReturnType<typeof listProjects>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProjects>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listProjects>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListProjectsQueryResult = NonNullable<Awaited<ReturnType<typeof listProjects>>>;
export type ListProjectsQueryError = ErrorType<unknown>;
/**
 * @summary List all projects
 */
export declare function useListProjects<TData = Awaited<ReturnType<typeof listProjects>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProjects>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateProjectUrl: () => string;
/**
 * @summary Create a new project
 */
export declare const createProject: (projectInput: ProjectInput, options?: RequestInit) => Promise<Project>;
export declare const getCreateProjectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProject>>, TError, {
        data: BodyType<ProjectInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createProject>>, TError, {
    data: BodyType<ProjectInput>;
}, TContext>;
export type CreateProjectMutationResult = NonNullable<Awaited<ReturnType<typeof createProject>>>;
export type CreateProjectMutationBody = BodyType<ProjectInput>;
export type CreateProjectMutationError = ErrorType<unknown>;
/**
* @summary Create a new project
*/
export declare const useCreateProject: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProject>>, TError, {
        data: BodyType<ProjectInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createProject>>, TError, {
    data: BodyType<ProjectInput>;
}, TContext>;
export declare const getGetProjectUrl: (id: string) => string;
/**
 * @summary Get a project by ID
 */
export declare const getProject: (id: string, options?: RequestInit) => Promise<Project>;
export declare const getGetProjectQueryKey: (id: string) => readonly [`/api/projects/${string}`];
export declare const getGetProjectQueryOptions: <TData = Awaited<ReturnType<typeof getProject>>, TError = ErrorType<ApiError>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProject>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProjectQueryResult = NonNullable<Awaited<ReturnType<typeof getProject>>>;
export type GetProjectQueryError = ErrorType<ApiError>;
/**
 * @summary Get a project by ID
 */
export declare function useGetProject<TData = Awaited<ReturnType<typeof getProject>>, TError = ErrorType<ApiError>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateProjectUrl: (id: string) => string;
/**
 * @summary Update a project
 */
export declare const updateProject: (id: string, projectUpdate: ProjectUpdate, options?: RequestInit) => Promise<Project>;
export declare const getUpdateProjectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProject>>, TError, {
        id: string;
        data: BodyType<ProjectUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateProject>>, TError, {
    id: string;
    data: BodyType<ProjectUpdate>;
}, TContext>;
export type UpdateProjectMutationResult = NonNullable<Awaited<ReturnType<typeof updateProject>>>;
export type UpdateProjectMutationBody = BodyType<ProjectUpdate>;
export type UpdateProjectMutationError = ErrorType<unknown>;
/**
* @summary Update a project
*/
export declare const useUpdateProject: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProject>>, TError, {
        id: string;
        data: BodyType<ProjectUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateProject>>, TError, {
    id: string;
    data: BodyType<ProjectUpdate>;
}, TContext>;
export declare const getDeleteProjectUrl: (id: string) => string;
/**
 * @summary Delete a project
 */
export declare const deleteProject: (id: string, options?: RequestInit) => Promise<DeleteResult>;
export declare const getDeleteProjectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProject>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteProject>>, TError, {
    id: string;
}, TContext>;
export type DeleteProjectMutationResult = NonNullable<Awaited<ReturnType<typeof deleteProject>>>;
export type DeleteProjectMutationError = ErrorType<unknown>;
/**
* @summary Delete a project
*/
export declare const useDeleteProject: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProject>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteProject>>, TError, {
    id: string;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map