---
title: "Branching Algorithms 2 (Vertex Cover with LP)"
date: 2026-05-20
publishedAt: 2026-05-20T19:25:00+09:00
updatedAt: 2026-05-21T15:50:00+09:00
category: "Graph Theory"
subcategory: "Algorithms for NP-hard Problems"
layout: ../../layouts/PostLayout.astro
---

이 글은 2026년 봄학기에 KAIST에서 수강한 Algorithms for NP-hard Problems 강의의 [lecture note](https://github.com/ssimplexity/CS492_spring2026/blob/main/Lecture_Note_CS492.pdf)를 기반으로 한다.

이 글은 PS에서 다루는 그래프 이론에 익숙한 사람을 예상 독자로 하여, 쉬운 전달을 목표로 한다. 엄밀한 정의와 서술은 lecture note 원본에서 확인할 수 있다. 그래프에 관련된 일반적인 notation은 따로 정의하지 않는다. 정점 $n$개, 간선 $m$개를 가진 그래프를 다룰 때 $O^*(f(k, n, m))$은 $O(f(k, n, m) \cdot \text{poly}(k+n+m))$ 정도의 뜻을 가진다. 즉, polynomial factor는 무시한다.

## $O^*(4^{k-\text{lp}^*(G)})$-time algorithm for VERTEX COVER

> ### VERTEX COVER
>
> **입력:** Graph $G$와 양의 정수 $k$가 주어진다.
>
> **출력:** $G$의 크기 $k$ 이하인 vertex cover가 존재하는가?

그래프 $G$에 대해 $X \subseteq V(G)$가 $G$의 vertex cover라는 것은 $G$의 모든 간선에 대해 최소 한 개의 endpoint가 $X$에 포함된다는 것을 의미한다.

[1편](https://octane-kr.github.io/posts/branching-algorithms-1-vertex-cover-feedback-vertex-set/)에서는 vertex cover 문제를 간단한 branching으로 접근했었다. 이번에는 linear programming이라는 도구를 사용한 방법을 알아보자.

Linear programming은 주어진 문제를 선형 연립부등식과 선형 목표 함수로 모델링하여 푸는 기법이다. 최적화 문제를 풀기 위해 아주 많이 연구되어 왔으며, 따라서 이를 푸는 빠른 알고리즘이 많이 알려져 있고 다항 시간에 해를 찾을 수 있음 역시 [알려져 있다](https://en.wikipedia.org/wiki/Ellipsoid_method).

VERTEX COVER 문제를 LP로 모델링해보자. 집합 $X$를 잡는다는 것은 각 정점을 변수로 두고, $0$ 또는 $1$을 부여하는 것으로 생각할 수 있다. $X$가 vertex cover라는 것은 모든 간선에 대해 양쪽 endpoint에 대응되는 변수(앞으로는 이 값을 정점의 가중치라고 부르겠다)의 합이 $1$ 이상이라는 것을 의미한다. 따라서 vertex cover 조건은 간선의 개수와 같은 개수의 선형 부등식으로 표현 가능하다. 그러나 각 변수에 $0$ 또는 $1$을 넣는다는 조건은 표현할 수 없다. 따라서 조건을 조금 약화시켜 각 변수가 $0$ 이상이라고만 하자. 이때 목표 함수는 모든 변수의 합이 되고, 최솟값을 구하는 문제로 볼 수 있다.

이렇게 만든 약화된 LP의 해를 $x^*$라고 하고, 정점 $v \in V(G)$에 대해 $x^*$에서 $v$에 부여된 값은 $x^*_v$로 표기하자. 또한 $\sum \limits_{v \in V(G)} x^*_v$를 $\text{lp}^*(G)$라고 하자. 조건을 추가할 때 최적해의 크기가 감소할 수 없으므로 실제 vertex cover $X$에 대해 $|X| \geq \text{lp}^*(G)$임은 자명하다. 따라서 $k<\text{lp}^*(G)$면 바로 False를 return할 수 있다.

이제 main part로 들어가자. $V(G)$를 세 집합으로 분리하고 시작할 것이다. $x^*_v$가 $0.5$보다 작은 $v$의 집합을 $C$, $0.5$보다 큰 $v$의 집합을 $H$, 정확히 $0.5$인 $v$의 집합을 $R$이라 하자. 이때 $C$ 내부에는 간선이 있을 수 없음을 쉽게 알 수 있다. 물론 $C$와 $R$ 사이에도 간선이 있을 수 없다.

만약 $H$의 어떤 부분집합 $H'$에 대해 $|H'| > |N(H') \cap C|$라고 해보자. 그렇다면 $H'$에 속하는 정점의 가중치에서 $\epsilon$씩 빼고 $N(H') \cap C$에 속하는 정점의 가중치에서 $\epsilon$씩 더하면 조건에 모순을 만들지 않으면서 전체 가중치 합을 감소시킬 수 있다. 따라서 모든 $H' \subseteq H$에 대해 $|H'| \leq |N(H') \cap C|$이다.

이제 $H$에서 가중치가 $1$이 아닌 정점의 집합 $X$와 $C$에서 가중치가 $0$이 아닌 집합 $Y$를 생각해보자. 물론 $X$와 $C \setminus Y$ 사이에는 간선이 존재할 수 없다. 따라서 $|Y| \geq |N(X) \cap C|$이다. 이제 $\delta = \min(\{1-x^*_v: v \in X\} \cup \{x^*_v: v \in Y\})$라고 정의했을 때, $X$에 속한 각 정점의 가중치에서 $\delta$를 더하고 $Y$에 속한 각 정점의 가중치에서 $\delta$를 빼도 LP의 조건에 문제가 없음을 알 수 있다. 이를 반복하면 결국 $C, R, H$를 각각 가중치가 $0$, $0.5$, $1$인 점의 집합으로 만들면서 총 가중치 합을 증가시키지 않을 수 있다.

물론 위 과정을 그대로 실행할 필요는 없고, LP를 풀고 얻은 $C, R, H$에 처음부터 $0$, $0.5$, $1$을 가중치로 줘도 optimal solution을 얻음이 증명되었다고 보면 된다. 즉, $x^*$를 half-integral solution으로 생각할 수 있다.

이제 $G$의 optimal한 vertex cover $X$를 하나 생각해보자. 만약 $H$에서 $X$에 속하지 않은 정점이 존재한다면, 그러한 점을 모은 $H'$을 생각할 수 있다. 이때 vertex cover 조건에 의해 $N(H')$은 모두 $X$에 속한다. 위에서 $|H'| \leq |N(H') \cap C|$를 보였으므로 $X$에서 $N(H') \cap C$를 빼고 $H'$을 넣어도 된다는 결론을 얻을 수 있다. 즉, $H$를 포함하는 optimal한 vertex cover $X$가 존재한다. 이때 $X \cap C = \emptyset$임도 쉽게 관찰 가능하다.

이제 $G$에 크기 $k$짜리 vertex cover가 있다는 것은 $G[R]$에 크기 $k-|H|$짜리 vertex cover가 있다는 사실과 동치임을 알 수 있다.

[1편](https://octane-kr.github.io/posts/branching-algorithms-1-vertex-cover-feedback-vertex-set/)의 기본적인 branching algorithm을 떠올리자. 단순히 간선을 하나 잡고 양쪽 endpoint 중 하나를 vertex cover에 넣은 branch $(G-v, k-1)$에 들어가기를 반복하는 알고리즘이다.

이때 위 일련의 과정을 통해 $(G, k)$를 $(G[R], k-|H|)$로 바꾸고 branch에 들어가기를 매 branch 전에 반복한다면 depth를 줄일 수 있다. 정확히는, 어떤 정점 $v$에 대해 $\text{lp}^*(G) = \text{lp}^*(G-v)+1$이라면 $G-v$에서 LP를 풀고 얻은 $C, R, H$에 대해 $C, R, H \cup \{v\}$는 $G$의 optimal solution을 만들어주는 분할이 되므로, $(G, k)$ 대신 $(G[R], k-|H \cup \{v\}|)$에 대한 문제로 축소하는 과정을 최대한 반복한 후에 branch로 들어간다고 하자. $G$에서 아무 $C, R, H$나 뽑지 않는 이유는 reduction을 끝까지 적용하고 나면 branch로 들어갈 때 $\text{lp}^*$의 값이 최대 $0.5$ 감소한다는 보장을 얻기 위해서이다. 이렇게 설계한 알고리즘에서, $k$는 branch로 내려갈 때 $1$ 감소하고 $\text{lp}^*$는 최대 $0.5$ 감소하므로 $k-\text{lp}^*(G)$는 최소 $0.5$ 감소한다. 따라서 depth는 최대 $2(k-\text{lp}^*(G))$가 된다.

이로써 $O^*(2^{2(k-\text{lp}^*(G))}) = O^*(4^{k-\text{lp}^*(G)})$-time에 동작하는 VERTEX COVER 문제의 알고리즘을 얻었다. 그러나 식의 형태를 보면 복잡한 과정을 거쳤음에도 아주 간단한 $O^*(2^k)$ 알고리즘보다 느릴 수도 있을 것 같아 보인다. 그러나, 만약 $k$가 $2\text{lp}^*(G)$ 이상이라면 $R \cup H$라는 $k$ 이하의 크기를 갖는 vertex cover를 얻을 수 있으므로 바로 True를 return할 수 있다. 이를 적용하면 우리의 알고리즘은 최대 $O^*(2^k)$ 시간에 동작하게 되며, 약화된 LP가 좋은 답을 내놓았을수록 빠른 시간에 동작하는 알고리즘임을 알 수 있다.