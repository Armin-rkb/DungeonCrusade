using UnityEngine;

public class Party : MonoBehaviour
{
    private float Speed = 1f;
    private SpriteRenderer rend;
    public Color lerpedColor = Color.white;

    [SerializeField]
    private float _speedMultiplier;
    void Start()
    {
        rend = GetComponent<SpriteRenderer>();
    }

    void Update()
    {
         rend.material.SetColor("_Color", HSBColor.ToColor(new HSBColor( Mathf.PingPong(Time.time * Speed * _speedMultiplier, 1), 1, 1)));
    }
}