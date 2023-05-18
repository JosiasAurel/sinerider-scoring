FROM ubuntu:23.10

RUN apt-get -y update
RUN apt-get -y install git ffmpeg chromium-browser nodejs npm
RUN mkdir /usr/app
WORKDIR /usr/app
COPY ./start_service.sh ./
RUN chmod a+wrx /usr/app/start_service.sh
ENTRYPOINT /usr/app/start_service.sh
