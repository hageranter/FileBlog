
# Use .NET 10 SDK (adjust the tag when .NET 10 is officially released)
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /app

# Copy everything and restore
COPY . . 
RUN dotnet restore

# Build and publish
RUN dotnet publish -c Release -o out

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview
WORKDIR /app
COPY --from=build /app/out .

# Expose port
EXPOSE 80
ENTRYPOINT ["dotnet", "FileBlogApi.dll"]
