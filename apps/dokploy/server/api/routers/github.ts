import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import {
	apiFindGithubBranches,
	apiFindOneGithub,
	apiUpdateGithub,
} from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import {
	getGithubBranches,
	getGithubRepositories,
	findGithubById,
	haveGithubRequirements,
	updateGitProvider,
} from "@dokploy/builders";

export const githubRouter = createTRPCRouter({
	one: protectedProcedure
		.input(apiFindOneGithub)
		.query(async ({ input, ctx }) => {
			const githubProvider = await findGithubById(input.githubId);
			// if (githubProvider.gitProvider.adminId !== ctx.user.adminId) { //TODO: Remove this line when the cloud version is ready
			// 	throw new TRPCError({
			// 		code: "UNAUTHORIZED",
			// 		message: "You are not allowed to access this github provider",
			// 	});
			// }
			return githubProvider;
		}),
	getGithubRepositories: protectedProcedure
		.input(apiFindOneGithub)
		.query(async ({ input }) => {
			return await getGithubRepositories(input.githubId);
		}),
	getGithubBranches: protectedProcedure
		.input(apiFindGithubBranches)
		.query(async ({ input }) => {
			return await getGithubBranches(input);
		}),
	githubProviders: protectedProcedure.query(async () => {
		const result = await db.query.github.findMany({
			with: {
				gitProvider: true,
			},
		});

		const filtered = result
			.filter((provider) => haveGithubRequirements(provider))
			.map((provider) => {
				return {
					githubId: provider.githubId,
					gitProvider: {
						...provider.gitProvider,
					},
				};
			});

		return filtered;
	}),

	testConnection: protectedProcedure
		.input(apiFindOneGithub)
		.mutation(async ({ input }) => {
			try {
				const result = await getGithubRepositories(input.githubId);
				return `Found ${result.length} repositories`;
			} catch (err) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: err instanceof Error ? err?.message : `Error: ${err}`,
				});
			}
		}),
	update: protectedProcedure
		.input(apiUpdateGithub)
		.mutation(async ({ input, ctx }) => {
			const githubProvider = await findGithubById(input.githubId);
			// if (githubProvider.gitProvider.adminId !== ctx.user.adminId) { //TODO: Remove this line when the cloud version is ready
			// 	throw new TRPCError({
			// 		code: "UNAUTHORIZED",
			// 		message: "You are not allowed to access this github provider",
			// 	});
			// }
			await updateGitProvider(input.gitProviderId, {
				name: input.name,
				adminId: ctx.user.adminId,
			});
		}),
});
