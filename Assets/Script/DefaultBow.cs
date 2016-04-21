using UnityEngine;
using System.Collections;

public class DefaultBow : MonoBehaviour, IWeapons
{
    [SerializeField] private GameObject arrow;



    public void Attack()
    {
        Instantiate(arrow, new Vector2(transform.position.x + 1, transform.position.y), transform.rotation);
    }

    void Update()
    {
        if (Input.GetMouseButtonDown(0))
        {
            Attack();
        }
    }
}
