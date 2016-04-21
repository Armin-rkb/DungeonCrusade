using UnityEngine;
using System.Collections;

public class DefaultBow : MonoBehaviour, IWeapons
{
    [SerializeField] private GameObject arrow;

    public void Attack()
    {
        Instantiate(arrow, transform.position, transform.rotation);
    }

    void Update()
    {
        if (Input.GetMouseButtonDown(0))
        {
            Attack();
        }
    }
}
