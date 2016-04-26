using UnityEngine;
using System.Collections;

public class DefaultBow : MonoBehaviour, IWeapons
{
    [SerializeField] private GameObject arrow;
    private Arrow arrowScript;
    private PlayerFlip flip;
    private float cooldown = 0;

    void Awake()
    {
        flip = GetComponent<PlayerFlip>();
    }

    public void Attack()
    {
        if (flip.facingRight)
        {
            GameObject currArrow = Instantiate(arrow, new Vector2(transform.position.x + 1, transform.position.y), arrow.transform.rotation)as GameObject;
            currArrow.GetComponent<Arrow>().ShootRight();
        }
        else
        {
            GameObject currArrow = Instantiate(arrow, new Vector2(transform.position.x - 1, transform.position.y), arrow.transform.rotation) as GameObject;
            currArrow.GetComponent<Arrow>().ShootLeft();
        }
    }

    void Update()
    {
        if (cooldown <= 60)
        {
            cooldown--;

            if (cooldown <= 1)
                cooldown = 0;
        }

        if (Input.GetMouseButtonDown(0) && cooldown == 0)
        {
            cooldown = 60;
            Attack();
        }
    }
}
