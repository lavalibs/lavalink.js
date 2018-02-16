FROM openjdk:9-jre-slim

WORKDIR /usr/src/lavalink

RUN apt-get update && apt-get upgrade -y && apt-get install -y wget

RUN wget -O Lavalink.jar -q https://ci.fredboat.com/repository/download/Lavalink_Build/2938:id/Lavalink.jar?guest=1
RUN apt-get remove -y wget && apt-get autoremove -y

COPY application.yml .

CMD ["java", "-jar", "Lavalink.jar"]
