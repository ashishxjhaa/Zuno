FROM e2bdev/base

# Install bun into /home/user/.bun (BUN_INSTALL must be set before the install script).
ENV BUN_INSTALL=/home/user/.bun
ENV PATH=/home/user/.bun/bin:/usr/local/bin:/usr/bin:/bin
RUN curl -fsSL https://bun.sh/install | bash \
  && chown -R 1000:1000 /home/user/.bun \
  && test -x /home/user/.bun/bin/bun \
  && /home/user/.bun/bin/bun --version \
  && echo 'export BUN_INSTALL=/home/user/.bun' > /etc/profile.d/zuno-bun.sh \
  && echo 'export PATH=/home/user/.bun/bin:$PATH' >> /etc/profile.d/zuno-bun.sh

# Prebaked app scaffold + node_modules.
COPY project /home/user/project
WORKDIR /home/user/project
RUN /home/user/.bun/bin/bun install \
  && chown -R 1000:1000 /home/user/project
