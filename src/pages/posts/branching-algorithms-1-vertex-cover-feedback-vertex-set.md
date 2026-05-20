---
title: "Branching Algorithms 1 (Vertex Cover, Feedback Vertex Set)"
date: 2026-05-20
publishedAt: 2026-05-20T15:43:40+09:00
updatedAt: 2026-05-20T19:28:42+09:00
category: "Graph Theory"
subcategory: "Algorithms for NP-hard Problems"
layout: ../../layouts/PostLayout.astro
---

이 글은 2026년 봄학기에 KAIST에서 수강한 Algorithms for NP-hard Problems 강의의 [lecture note](https://github.com/ssimplexity/CS492_spring2026/blob/main/Lecture_Note_CS492.pdf)를 기반으로 한다.

이 글은 PS에서 다루는 그래프 이론에 익숙한 사람을 예상 독자로 하여, 쉬운 전달을 목표로 한다. 엄밀한 정의와 서술은 lecture note 원본에서 확인할 수 있다. 그래프에 관련된 일반적인 notation은 따로 정의하지 않는다. 정점 $n$개, 간선 $m$개를 가진 그래프를 다룰 때 $O^*(f(k, n, m))$은 $O(f(k, n, m) \cdot \text{poly}(k+n+m))$ 정도의 뜻을 가진다. 즉, polynomial factor는 무시한다.

## $O^*(2^k)$-time algorithm for VERTEX COVER

> ### VERTEX COVER
>
> **입력:** Graph $G$와 양의 정수 $k$가 주어진다.
>
> **출력:** $G$의 크기 $k$ 이하인 vertex cover가 존재하는가?

VERTEX COVER 문제는 NP-hard 문제의 유명한 예시이다. 그래프 $G$에 대해 $X \subseteq V(G)$가 $G$의 vertex cover라는 것은 $G$의 모든 edge에 대해 최소 한 개의 endpoint가 $X$에 포함된다는 것을 의미한다.

각 edge의 endpoint 중 하나가 vertex cover에 들어가야 한다는 점을 이용해, 간단한 알고리즘 $VC(G, k)$를 고안할 수 있다. Edge $uv$를 하나 고르고, $VC(G-u, k-1) \lor VC(G-v, k-1)$을 return하면 된다. $k$가 0 이상일 때 edge가 남지 않으면 우리는 원본 $G$의 vertex cover를 찾게 된다.

매 단계에서 두 개의 branch가 생기고, 최대 depth는 $k$이므로, 알고리즘의 running time은 $O^*(2^k)$가 된다(depth가 $k-1$인지 $k$인지 $k+1$인지는 사실 생각해보지 않았지만 어차피 같은 $O^*(2^k)$가 된다는 사고를 가지도록 하자). 이렇게 branch를 만들고 branch의 개수와 depth를 bound하여 분석하는 기법을 branching이라고 한다.

## $O^*((3k)^k)$-time algorithm for FEEDBACK VERTEX SET

> ### FEEDBACK VERTEX SET
>
> **입력:** Graph $G$와 양의 정수 $k$가 주어진다.
>
> **출력:** $G$의 크기 $k$ 이하인 feedback vertex set이 존재하는가?

그래프 $G$에 대해 $X \subseteq V(G)$가 $G$의 feedback vertex set이라는 것은 $G-X$가 forest라는 것을 의미한다.

위의 vertex cover와 비슷한 알고리즘을 설계하려고 보니, 어떤 edge는 두 endpoint가 모두 $V(G) \setminus X$에 포함되어도 문제가 없다. 게다가 해당 edge를 미리 알 수 있는 방법도 없다. 즉 '최소 한 개의 정점은 FVS에 들어가는 작은 vertex set'을 찾을 필요가 생긴다. 이를 위해 아래 관찰이 필요하다.

$G = (V, E)$라고 하자. $X$가 $G$의 FVS라면 $G-X$는 forest이므로 최대 $|V|-|X|-1$개의 간선을 가진다. $E$는 $G-X$ 내부의 간선과 $X$에 연결된 간선으로 분리할 수 있으므로, $|E| \leq (|V|-|X|-1) + \sum \limits _{v \in X} \deg(v)$를 얻는다. 이를 정리하면 $\sum \limits _{v \in X} (\deg(v)-1) \geq |E|-|V|+1$이 된다.

이제 차수가 가장 큰 $3k$개의 정점을 생각하자. 이들의 집합을 $S$라 할 때, $X \cap S = \emptyset$이라고 해보자. 그러면 $\sum \limits_{v \in S} (\deg(v)-1) \geq 3 \sum \limits_{v \in X} (\deg(v)-1) \geq 3(|E|-|V|+1)$을 얻는다. 또한 $X$는 $V \setminus S$에 포함되어야 하므로 $\sum \limits_{v \in V \setminus S} (\deg(v)-1) \geq \sum \limits_{v \in X} (\deg(v)-1) \geq |E|-|V|+1$ 역시 자명하다. 두 식을 더하면 $\sum \limits _{v \in V} (\deg(v)-1) \geq 4(|E|-|V|+1)$을 얻는데, 좌변이 $2|E|-|V|$임은 쉽게 관찰할 수 있다. 이를 정리하면 $3|V| > 2|E| = \sum \limits _{v \in V} \deg(v)$을 얻는다.

만약 위 식이 거짓이라면 우리는 언제나 $S \cap X$가 nonempty임을 얻고, 자연스럽게 매번 차수가 가장 큰 $3k$개의 정점 중 하나를 택하는 branching algorithm을 얻게 된다. 위 식을 거짓으로 만드는 쉬운 방법 중 하나는 모든 정점의 차수를 3 이상으로 만드는 것인데, 생각해보면 어렵지 않다. 차수가 1인 정점은 FVS에 아무런 영향을 주지 않으므로 incident한 edge와 함께 제거해도 문제 없고, 차수가 2인 정점은 incident한 두 edge를 하나로 합치면서 해당 정점을 제거해도 문제가 없다. 즉, 이런 전처리 과정을 끝낸 후에는 임의의 FVS $X$에 대해 $S \cap X \neq \emptyset$라고 할 수 있다.

Lecture note에는 이 알고리즘의 running time이 $O^*((3k)^k)$라고 되어 있으나, 한 branch로 내려갈 때 $k$도 1 줄어드므로 running time은 $O^*(3^k \cdot k!)$이며, [스털링 근사](https://namu.wiki/w/%EC%8A%A4%ED%84%B8%EB%A7%81%20%EA%B7%BC%EC%82%AC)를 적용하면 $O^*((3k/e)^k)$로 보인다.