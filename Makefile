build:
	@component build -c -b 'last 2 versions'

dev:
	@component build -d -c -b 'last 2 versions'

watch:
	@component build -w -d -c -b 'last 2 versions'

.PHONY: build clean test
