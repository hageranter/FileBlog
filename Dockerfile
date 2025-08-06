# Use .NET 10 ASP.NET runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS base
WORKDIR /app
EXPOSE 80

# Use .NET 10 SDK for building
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

# Copy csproj and restore
COPY ["FileBlogApi.csproj", "./"]
RUN dotnet restore "FileBlogApi.csproj"

# Copy all source and publish
COPY . .
RUN dotnet publish -c Release -o /app/publish

# Final runtime image
FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "FileBlogApi.dll"]
